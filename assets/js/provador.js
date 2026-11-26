'use strict';

/*
 * PROVADOR VIRTUAL
 * ------------------------------------------------------------
 * A pessoa liga a câmera (ou envia uma foto), o MediaPipe Face Landmarker
 * encontra os pontos do rosto e o óculos escolhido é desenhado sobre os olhos.
 *
 * Tudo roda no navegador: a imagem NÃO é enviada para nenhum servidor.
 * A biblioteca (~15 MB) só é baixada quando alguém abre o provador.
 *
 * Imagem do óculos: por enquanto usa a ilustração de frente (glasses-art.js).
 * Para usar uma foto real, crie assets/images/provador/<id>.png (óculos de frente,
 * fundo transparente, lentes centralizadas na altura y do meio da imagem) e
 * preencha "provador" no products.js com: { largura: <px entre os centros das lentes> }.
 */
(function () {
  const BASE = new URL('../', document.currentScript.src);          // .../assets/
  const MP = new URL('vendor/mediapipe/', BASE).href;

  // pontos do rosto (Face Landmarker): cantos dos olhos
  const OLHO_A = [33, 133];
  const OLHO_B = [362, 263];
  // largura total do óculos em relação à distância entre os olhos (ilustração: lentes a ±64)
  const DX = { oversized: 70 };
  // óculos um pouco mais largo que a distância entre os olhos, como na vida real
  const AJUSTE = 1.12;
  // zoom máximo da câmera em tela cheia (1 = imagem inteira, sem corte)
  const ZOOM_MAX = 1.2;

  let fundo, fctx, convite, modal, video, canvas, ctx, status, lista, btnCamera, btnFoto, inputFoto, btnSalvar, btnSacola;
  let landmarker = null, carregando = null;
  let produto = null, oculosImg = null;
  let modo = null;               // 'camera' | 'foto'
  let stream = null, loop = null, ultimoTempo = -1;
  let foto = null, pontosFoto = null;

  const $ = (s, el = document) => el.querySelector(s);
  const byId = id => (window.PRODUTOS || []).find(p => p.id === id);

  /* ---------- imagem do óculos ---------- */
  function svgOculos(p) {
    const g = window.GlassesArt.glassesGroup(
      { formato: p.formato, armacao: p.armacao, lente: p.corLente, espelhado: p.espelhado }, 'pv' + p.id.replace(/\W/g, ''));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -100 400 200" width="800" height="400">
      <g opacity="0.96">${g}</g></svg>`;
  }
  function carregarOculos(p) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgOculos(p));
    });
  }

  /* ---------- MediaPipe ---------- */
  function iniciarModelo() {
    if (landmarker) return Promise.resolve(landmarker);
    if (carregando) return carregando;
    mostrarStatus('Carregando o provador… (só na primeira vez)');
    carregando = import(MP + 'vision_bundle.mjs').then(async ({ FaceLandmarker, FilesetResolver }) => {
      const arquivos = await FilesetResolver.forVisionTasks(MP + 'wasm');
      const opcoes = delegate => ({
        baseOptions: { modelAssetPath: MP + 'face_landmarker.task', delegate },
        runningMode: 'IMAGE',
        numFaces: 1
      });
      try {
        landmarker = await FaceLandmarker.createFromOptions(arquivos, opcoes('GPU'));
      } catch (e) {
        // alguns celulares não aceitam a placa de vídeo: usa o processador
        landmarker = await FaceLandmarker.createFromOptions(arquivos, opcoes('CPU'));
      }
      if (!modo) esconderStatus();       // pronto: some a mensagem de "carregando"
      return landmarker;
    }).catch(err => {
      carregando = null;
      mostrarStatus('Não foi possível carregar o provador neste navegador.');
      throw err;
    });
    return carregando;
  }

  /* ---------- desenho ---------- */
  function centroOlho(pts, ids, w, h, espelhar) {
    const x = (pts[ids[0]].x + pts[ids[1]].x) / 2;
    const y = (pts[ids[0]].y + pts[ids[1]].y) / 2;
    return { x: (espelhar ? 1 - x : x) * w, y: y * h };
  }

  function desenharOculos(pts, w, h, espelhar) {
    if (!pts || !oculosImg) return;
    let a = centroOlho(pts, OLHO_A, w, h, espelhar);
    let b = centroOlho(pts, OLHO_B, w, h, espelhar);
    if (a.x > b.x) [a, b] = [b, a];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const dx = DX[produto.formato] || 64;
    const esc = AJUSTE * dist / (2 * dx);                 // unidades do desenho -> pixels
    ctx.save();
    ctx.translate((a.x + b.x) / 2, (a.y + b.y) / 2);
    ctx.rotate(ang);
    ctx.scale(esc, esc);
    ctx.drawImage(oculosImg, -200, -100, 400, 200);
    ctx.restore();
  }

  // Em tela cheia a imagem da câmera é cortada para preencher a tela; o corte acompanha o rosto
  let foco = null;
  function enquadrar(pts) {
    // centro do rosto (0 a 1), já espelhado como a imagem na tela
    const fx = 1 - (pts[33].x + pts[263].x) / 2;
    const fy = (pts[33].y + pts[263].y) / 2;
    // A imagem aparece inteira ("contain") e ganha só um zoom leve (no máximo ZOOM_MAX)
    // para preencher melhor a tela, centralizando o rosto. Sem isso, uma câmera deitada
    // numa tela em pé ficava ampliada 3 a 4 vezes.
    const W = canvas.width, H = canvas.height, cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!W || !cw) return;
    const cabe = Math.min(cw / W, ch / H), cobre = Math.max(cw / W, ch / H);
    const z = Math.min(cobre / cabe, ZOOM_MAX);
    const dw = W * cabe * z, dh = H * cabe * z;                // tamanho na tela já com zoom
    const limX = Math.max(0, (dw - cw) / 2), limY = Math.max(0, (dh - ch) / 2);
    // espaço livre entre a barra de cima e o painel de baixo: o rosto fica no meio dele
    const topo = modal.querySelector('.provador-topo').offsetHeight * 0.6;
    const painel = modal.querySelector('.provador-painel').offsetHeight * 0.85;
    const desl = (topo - painel) / 2;
    const alvo = {
      x: Math.max(-limX, Math.min(limX, -(fx - 0.5) * dw)),
      y: limY > 0
        ? Math.max(-limY, Math.min(limY, -(fy - 0.5) * dh + desl))
        : Math.max(desl, -(ch - dh) / 2)                     // imagem menor que a tela: só sobe um pouco
    };
    if (!foco) foco = alvo;
    foco.x += (alvo.x - foco.x) * 0.2;                        // suaviza o movimento
    foco.y += (alvo.y - foco.y) * 0.2;
    canvas.style.transform = `translate(${foco.x.toFixed(1)}px, ${foco.y.toFixed(1)}px) scale(${z.toFixed(3)})`;
  }

  function quadroCamera() {
    if (modo !== 'camera' || !video.videoWidth) { loop = requestAnimationFrame(quadroCamera); return; }
    const w = video.videoWidth, h = video.videoHeight;
    if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
    ctx.save();
    ctx.translate(w, 0); ctx.scale(-1, 1);                 // espelho, como numa selfie
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();
    const agora = performance.now();
    if (landmarker && agora !== ultimoTempo) {
      ultimoTempo = agora;
      const r = landmarker.detectForVideo(video, agora);
      const pts = r.faceLandmarks && r.faceLandmarks[0];
      if (pts) { desenharOculos(pts, w, h, true); enquadrar(pts); esconderStatus(); }
      else mostrarStatus('Posicione o rosto de frente para a câmera');
      pintarFundo();
    }
    loop = requestAnimationFrame(quadroCamera);
  }

  function desenharFoto() {
    if (!foto) return;
    const max = 1280;
    const s = Math.min(1, max / Math.max(foto.width, foto.height));
    const w = Math.round(foto.width * s), h = Math.round(foto.height * s);
    canvas.width = w; canvas.height = h;
    ctx.drawImage(foto, 0, 0, w, h);
    desenharOculos(pontosFoto, w, h, false);
    pintarFundo();
  }

  // fundo desfocado com a própria imagem, para não sobrar faixa preta em volta
  function pintarFundo() {
    if (canvas.width) fctx.drawImage(canvas, 0, 0, fundo.width, fundo.height);
  }

  /* ---------- câmera e foto ---------- */
  async function usarCamera() {
    pararCamera();
    modo = 'camera';
    modal.classList.add('modo-camera'); modal.classList.remove('modo-foto');
    foto = null;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      mostrarStatus('Seu navegador não permite usar a câmera aqui. Envie uma foto.');
      return;
    }
    try {
      mostrarStatus('Pedindo permissão para a câmera…');
      // tela em pé (celular): pede a câmera em pé também, para ocupar a tela toda sem cortar o rosto
      const emPe = innerHeight > innerWidth;
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: emPe ? 720 : 1280 }, height: { ideal: emPe ? 1280 : 720 } },
        audio: false
      });
      video.srcObject = stream;
      await video.play();
      const lm = await iniciarModelo();
      await lm.setOptions({ runningMode: 'VIDEO' });
      mostrarStatus('Posicione o rosto de frente para a câmera');
      cancelAnimationFrame(loop);
      quadroCamera();
      evento('provador_camera');
    } catch (e) {
      modo = null;
      mostrarStatus(e && e.name === 'NotAllowedError'
        ? 'A câmera foi bloqueada. Libere nas permissões do navegador ou envie uma foto.'
        : 'Não foi possível abrir a câmera. Envie uma foto.');
    }
  }

  function pararCamera() {
    cancelAnimationFrame(loop);
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    if (video) video.srcObject = null;
  }

  async function usarFoto(arquivo) {
    if (!arquivo || !/^image\//.test(arquivo.type)) return;
    pararCamera();
    modo = 'foto';
    modal.classList.add('modo-foto'); modal.classList.remove('modo-camera');
    canvas.style.transform = '';
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(url);
      foto = img;
      pontosFoto = null;
      desenharFoto();
      try {
        const lm = await iniciarModelo();
        await lm.setOptions({ runningMode: 'IMAGE' });
        const r = lm.detect(img);
        pontosFoto = r.faceLandmarks && r.faceLandmarks[0];
        desenharFoto();
        if (pontosFoto) esconderStatus();
        else mostrarStatus('Não encontramos um rosto nesta foto. Tente uma foto de frente, com o rosto bem iluminado.');
        evento('provador_foto');
      } catch (e) { /* mensagem já mostrada */ }
    };
    img.onerror = () => { URL.revokeObjectURL(url); mostrarStatus('Não foi possível abrir esta imagem.'); };
    img.src = url;
  }

  /* ---------- interface ---------- */
  function mostrarStatus(t) { status.textContent = t; status.hidden = false; }
  function esconderStatus() { status.hidden = true; }
  function evento(nome) {
    if (window.azzurraEvento && produto) window.azzurraEvento(nome, { item_id: produto.id, item_name: produto.nome });
  }

  let pedido = 0;
  async function escolher(id) {
    const p = byId(id);
    if (!p) return;
    produto = p;
    const meu = ++pedido;
    const img = await carregarOculos(p);
    if (meu !== pedido) return;          // a pessoa já escolheu outro modelo
    oculosImg = img;
    lista.querySelectorAll('[data-pv-produto]').forEach(b => {
      const ativo = b.dataset.pvProduto === id;
      b.setAttribute('aria-pressed', String(ativo));
      if (ativo) lista.scrollTo({ left: b.offsetLeft - (lista.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
    });
    $('[data-pv-nome]', modal).textContent = p.nome;
    btnSacola.disabled = !p.estoque;
    if (modo === 'foto') desenharFoto();
  }

  const aspas = t => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  function criar() {
    /* ----- caixa de convite (aparece primeiro) ----- */
    convite = document.createElement('div');
    convite.className = 'provador-convite';
    convite.hidden = true;
    convite.setAttribute('role', 'dialog');
    convite.setAttribute('aria-modal', 'true');
    convite.setAttribute('aria-label', 'Experimentar no rosto');
    convite.innerHTML = `
      <div class="provador-convite-caixa">
        <button class="provador-fechar" data-cv-fechar aria-label="Fechar"><ion-icon name="close-outline"></ion-icon></button>
        <img class="provador-convite-img" data-cv-img alt="">
        <p class="provador-convite-titulo">Quer experimentar no seu rosto?</p>
        <p class="provador-convite-texto">Veja como o <b data-cv-nome></b> fica em você, ao vivo pela câmera ou com uma foto.</p>
        <button class="provador-btn" data-cv-camera><ion-icon name="camera-outline"></ion-icon> Usar a câmera</button>
        <button class="provador-btn provador-btn--claro" data-cv-foto><ion-icon name="image-outline"></ion-icon> Enviar uma foto</button>
        <button class="provador-convite-nao" data-cv-fechar>Agora não</button>
        <p class="provador-aviso">A imagem fica só no seu aparelho: nada é enviado ou guardado.</p>
      </div>`;
    document.body.appendChild(convite);

    /* ----- provador em tela cheia ----- */
    modal = document.createElement('div');
    modal.className = 'provador';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Provador virtual');
    modal.innerHTML = `
      <div class="provador-palco">
        <canvas class="provador-fundo" width="48" height="64" aria-hidden="true"></canvas>
        <canvas class="provador-canvas" aria-label="Seu rosto com o óculos escolhido"></canvas>
        <video class="provador-video" playsinline muted></video>
        <p class="provador-status" hidden></p>
      </div>
      <div class="provador-topo">
        <div>
          <p class="provador-titulo">Provador virtual</p>
          <p class="provador-nome" data-pv-nome></p>
        </div>
        <button class="provador-fechar" data-pv-fechar aria-label="Fechar"><ion-icon name="close-outline"></ion-icon></button>
      </div>
      <div class="provador-painel">
        <div class="provador-lista" data-pv-lista></div>
        <div class="provador-acoes">
          <button class="provador-btn provador-btn--claro" data-pv-camera><ion-icon name="camera-outline"></ion-icon><span>Câmera</span></button>
          <button class="provador-btn provador-btn--claro" data-pv-foto><ion-icon name="image-outline"></ion-icon><span>Foto</span></button>
          <button class="provador-btn provador-btn--claro" data-pv-salvar><ion-icon name="download-outline"></ion-icon><span>Salvar</span></button>
          <button class="provador-btn provador-btn--sacola" data-pv-sacola><ion-icon name="bag-add-outline"></ion-icon><span>Adicionar à sacola</span></button>
        </div>
        <p class="provador-aviso">A imagem fica só no seu aparelho. O desenho do óculos é ilustrativo.</p>
      </div>
      <input type="file" accept="image/*" data-pv-arquivo>`;
    document.body.appendChild(modal);

    video = $('video', modal);
    canvas = $('.provador-canvas', modal);
    ctx = canvas.getContext('2d');
    fundo = $('.provador-fundo', modal);
    fctx = fundo.getContext('2d');
    status = $('.provador-status', modal);
    lista = $('[data-pv-lista]', modal);
    btnCamera = $('[data-pv-camera]', modal);
    btnFoto = $('[data-pv-foto]', modal);
    inputFoto = $('[data-pv-arquivo]', modal);
    btnSalvar = $('[data-pv-salvar]', modal);
    btnSacola = $('[data-pv-sacola]', modal);

    lista.innerHTML = window.PRODUTOS.map(p =>
      `<button class="provador-item" data-pv-produto="${p.id}" aria-pressed="false" title="${aspas(p.nome)}">
         <img src="${window.GlassesArt.toDataURI(svgOculos(p))}" alt="${aspas(p.nome)}">
       </button>`).join('');

    // convite -> provador
    $('[data-cv-camera]', convite).addEventListener('click', () => { abrirCheio(); usarCamera(); });
    $('[data-cv-foto]', convite).addEventListener('click', () => inputFoto.click());
    convite.addEventListener('click', e => { if (e.target === convite || e.target.closest('[data-cv-fechar]')) fecharConvite(); });

    // dentro do provador
    btnCamera.addEventListener('click', () => usarCamera());
    btnFoto.addEventListener('click', () => inputFoto.click());
    inputFoto.addEventListener('change', () => {
      const arq = inputFoto.files[0];
      inputFoto.value = '';
      if (!arq) return;
      if (modal.hidden) abrirCheio();
      usarFoto(arq);
    });
    lista.addEventListener('click', e => { const b = e.target.closest('[data-pv-produto]'); if (b) escolher(b.dataset.pvProduto); });
    btnSacola.addEventListener('click', () => { if (typeof window.addToCart === 'function') window.addToCart(produto.id); });
    btnSalvar.addEventListener('click', () => {
      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `azzurra-${produto.id}.jpg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, 'image/jpeg', 0.9);
    });
    modal.addEventListener('click', e => { if (e.target.closest('[data-pv-fechar]')) fechar(); });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      if (!modal.hidden) fechar(); else if (!convite.hidden) fecharConvite();
    });
  }

  // 1º passo: caixa perguntando se a pessoa quer experimentar
  function abrir(id) {
    if (!modal) criar();
    const p = byId(id) || produto || window.PRODUTOS[0];
    escolher(p.id);
    $('[data-cv-nome]', convite).textContent = p.nome;
    $('[data-cv-img]', convite).src = window.GlassesArt.toDataURI(svgOculos(p));
    convite.hidden = false;
    document.body.classList.add('no-scroll');
    if (window.azzurraEvento) window.azzurraEvento('provador_convite', { item_id: p.id });
  }

  function fecharConvite() {
    convite.hidden = true;
    if (modal.hidden) document.body.classList.remove('no-scroll');
  }

  // 2º passo: provador ocupando a tela inteira
  function abrirCheio() {
    convite.hidden = true;
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    // no celular (Android), esconde também as barras do navegador
    if (modal.requestFullscreen && matchMedia('(hover: none)').matches) modal.requestFullscreen().catch(() => {});
    if (window.azzurraEvento) window.azzurraEvento('provador_aberto', { item_id: produto && produto.id });
  }


  function fechar() {
    pararCamera();
    modo = null;
    modal.hidden = true;
    modal.classList.remove('modo-camera', 'modo-foto');
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    document.body.classList.remove('no-scroll');
  }

  window.AzzurraProvador = { abrir, fechar };
})();
