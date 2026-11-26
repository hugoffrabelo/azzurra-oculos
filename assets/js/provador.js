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

  let modal, video, canvas, ctx, status, lista, btnCamera, btnFoto, inputFoto, btnSalvar, btnSacola;
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
      landmarker = await FaceLandmarker.createFromOptions(arquivos, {
        baseOptions: { modelAssetPath: MP + 'face_landmarker.task', delegate: 'GPU' },
        runningMode: 'IMAGE',
        numFaces: 1
      });
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
      if (pts) { desenharOculos(pts, w, h, true); esconderStatus(); }
      else mostrarStatus('Posicione o rosto de frente para a câmera');
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
  }

  /* ---------- câmera e foto ---------- */
  async function usarCamera() {
    pararCamera();
    modo = 'camera';
    foto = null;
    btnSalvar.hidden = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      mostrarStatus('Seu navegador não permite usar a câmera aqui. Envie uma foto.');
      return;
    }
    try {
      mostrarStatus('Pedindo permissão para a câmera…');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
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
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(url);
      foto = img;
      pontosFoto = null;
      desenharFoto();
      btnSalvar.hidden = false;
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

  function criar() {
    modal = document.createElement('div');
    modal.className = 'provador';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Provador virtual');
    modal.innerHTML = `
      <div class="provador-caixa">
        <button class="provador-fechar" data-pv-fechar aria-label="Fechar"><ion-icon name="close-outline"></ion-icon></button>
        <p class="provador-titulo">Provador virtual</p>
        <div class="provador-palco">
          <canvas class="provador-canvas" aria-label="Seu rosto com o óculos escolhido"></canvas>
          <video class="provador-video" playsinline muted></video>
          <div class="provador-inicio" data-pv-inicio>
            <ion-icon name="glasses-outline"></ion-icon>
            <p>Veja como o óculos fica no seu rosto.</p>
          </div>
          <p class="provador-status" hidden></p>
        </div>
        <div class="provador-botoes">
          <button class="provador-btn" data-pv-camera>Usar a câmera</button>
          <button class="provador-btn provador-btn--claro" data-pv-foto>Enviar uma foto</button>
          <input type="file" accept="image/*" hidden data-pv-arquivo>
        </div>
        <div class="provador-lista" data-pv-lista></div>
        <div class="provador-rodape">
          <p class="provador-nome" data-pv-nome></p>
          <button class="provador-btn provador-btn--claro" data-pv-salvar hidden>Salvar imagem</button>
          <button class="provador-btn" data-pv-sacola>Adicionar à sacola</button>
        </div>
        <p class="provador-aviso">A imagem fica só no seu aparelho: nada é enviado ou guardado. O desenho do óculos é ilustrativo.</p>
      </div>`;
    document.body.appendChild(modal);

    video = $('video', modal);
    canvas = $('canvas', modal);
    ctx = canvas.getContext('2d');
    status = $('.provador-status', modal);
    lista = $('[data-pv-lista]', modal);
    btnCamera = $('[data-pv-camera]', modal);
    btnFoto = $('[data-pv-foto]', modal);
    inputFoto = $('[data-pv-arquivo]', modal);
    btnSalvar = $('[data-pv-salvar]', modal);
    btnSacola = $('[data-pv-sacola]', modal);

    lista.innerHTML = window.PRODUTOS.map(p =>
      `<button class="provador-item" data-pv-produto="${p.id}" aria-pressed="false" title="${p.nome.replace(/"/g, '&quot;')}">
         <img src="${window.GlassesArt.toDataURI(svgOculos(p))}" alt="${p.nome.replace(/"/g, '&quot;')}">
       </button>`).join('');

    const comecou = () => { const i = $('[data-pv-inicio]', modal); if (i) i.remove(); };
    btnCamera.addEventListener('click', () => { comecou(); usarCamera(); });
    btnFoto.addEventListener('click', () => inputFoto.click());
    inputFoto.addEventListener('change', () => { comecou(); usarFoto(inputFoto.files[0]); inputFoto.value = ''; });
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
    modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-pv-fechar]')) fechar(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) fechar(); });
  }

  function abrir(id) {
    if (!modal) criar();
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    escolher(id || (produto && produto.id) || window.PRODUTOS[0].id);
    if (window.azzurraEvento) window.azzurraEvento('provador_aberto', { item_id: id });
    iniciarModelo().catch(() => {});                        // já vai baixando enquanto a pessoa decide
  }

  function fechar() {
    pararCamera();
    modo = null;
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
  }

  window.AzzurraProvador = { abrir, fechar };
})();
