'use strict';

/*
 * CONFIGURAÇÃO DA LOJA E CATÁLOGO
 * ------------------------------------------------------------
 * Tudo o que aparece no site sai daqui. Para mudar produtos, preços
 * ou dados da loja, edite só este arquivo.
 *
 * Produto:
 *   id          identificador único (sem espaços)
 *   nome        nome exibido
 *   formato     aviador | wayfarer | redondo | gatinho | quadrado | hexagonal | oversized | esportivo
 *   publico     masculino | feminino | unissex
 *   lente       tipo de lente exibido (ex.: "Polarizada", "Espelhada", "Degradê")
 *   preco       preço atual em reais (número)
 *   precoAntigo preço "de" (opcional, para mostrar desconto)
 *   estoque     unidades disponíveis
 *   vendidos    unidades vendidas (usado em "Mais vendidos" e na oferta do dia)
 *   avaliacao   nota de 0 a 5 (troque pelas avaliações reais dos clientes)
 *   novo        true para aparecer em "Lançamentos"
 *   selo        texto opcional no canto da foto ("novo", "promo"...)
 *   descricao   texto curto
 *   imagem      (opcional) caminho de uma foto. Se omitido, o site procura
 *               assets/images/products/<id>-1.jpg.
 *               Sem foto, o site desenha uma ilustração com as cores abaixo.
 *   imagem2     (opcional) segunda foto, mostrada ao passar o mouse. Sem ela, repete a principal.
 *   armacao     cor da armação na ilustração (hex)
 *   corLente    cor da lente na ilustração (hex)
 */

window.LOJA = {
  nome: 'Azzurra',
  whatsapp: '5500000000000',      // DDI + DDD + número, só dígitos. Troque pelo seu!
  instagram: 'https://instagram.com/',
  freteGratisAcima: 199,
  descontoPix: 0.05                // 5% de desconto no Pix
};

window.PRODUTOS = [
  {
    id: 'aviador-classic-dourado', nome: 'Aviador Classic Dourado', formato: 'aviador', publico: 'unissex',
    lente: 'Polarizada', preco: 189.9, precoAntigo: 249.9, estoque: 40, vendidos: 132, avaliacao: 4.8,
    selo: 'promo', descricao: 'Armação metálica leve com ponte dupla e lente G15 polarizada. O clássico que combina com tudo.',
    armacao: '#c9a24a', corLente: '#3c4b3a'
  },
  {
    id: 'aviador-prata-espelhado', nome: 'Aviador Prata Espelhado', formato: 'aviador', publico: 'masculino',
    lente: 'Espelhada', preco: 199.9, estoque: 25, vendidos: 61, avaliacao: 4.6, novo: true, selo: 'novo',
    descricao: 'Metal prateado com lente espelhada azul. Proteção UV400.',
    armacao: '#b8b8b8', corLente: '#2b6bd6', espelhado: true
  },
  {
    id: 'wayfarer-preto-fosco', nome: 'Wayfarer Preto Fosco', formato: 'wayfarer', publico: 'unissex',
    lente: 'Polarizada', preco: 159.9, precoAntigo: 199.9, estoque: 60, vendidos: 210, avaliacao: 4.9,
    descricao: 'Acetato preto fosco, lente polarizada cinza. O mais vendido da loja.',
    armacao: '#1d1d1f', corLente: '#2b2b2b'
  },
  {
    id: 'wayfarer-tartaruga', nome: 'Wayfarer Tartaruga', formato: 'wayfarer', publico: 'unissex',
    lente: 'Degradê', preco: 169.9, estoque: 30, vendidos: 88, avaliacao: 4.7,
    descricao: 'Armação tartaruga com lente marrom degradê. Elegante para o dia a dia.',
    armacao: '#6b3f1d', corLente: '#5a3a22'
  },
  {
    id: 'redondo-retro-preto', nome: 'Redondo Retrô Preto', formato: 'redondo', publico: 'unissex',
    lente: 'UV400', preco: 139.9, estoque: 35, vendidos: 74, avaliacao: 4.5, novo: true, selo: 'novo',
    descricao: 'Inspirado nos anos 60, armação fina em metal e lentes redondas.',
    armacao: '#222222', corLente: '#3a3a3a'
  },
  {
    id: 'redondo-marrom', nome: 'Redondo Lente Marrom', formato: 'redondo', publico: 'feminino',
    lente: 'Degradê', preco: 149.9, precoAntigo: 179.9, estoque: 18, vendidos: 40, avaliacao: 4.4,
    descricao: 'Metal dourado com lente marrom degradê, delicado e atemporal.',
    armacao: '#b8933f', corLente: '#6b4a2b'
  },
  {
    id: 'cat-eye-bordo', nome: 'Gatinho Bordô', formato: 'gatinho', publico: 'feminino',
    lente: 'Degradê', preco: 179.9, precoAntigo: 229.9, estoque: 22, vendidos: 97, avaliacao: 4.8, selo: 'promo',
    descricao: 'Formato gatinho com acetato bordô e lente degradê. Puro charme.',
    armacao: '#7a2e3a', corLente: '#4a2a2a'
  },
  {
    id: 'cat-eye-branco', nome: 'Gatinho Off-White', formato: 'gatinho', publico: 'feminino',
    lente: 'UV400', preco: 169.9, estoque: 15, vendidos: 33, avaliacao: 4.6, novo: true, selo: 'novo',
    descricao: 'Armação off-white com lente cinza escura. Ótimo para o verão.',
    armacao: '#ece6da', corLente: '#333333'
  },
  {
    id: 'quadrado-preto', nome: 'Quadrado Urbano Preto', formato: 'quadrado', publico: 'masculino',
    lente: 'Polarizada', preco: 159.9, estoque: 45, vendidos: 120, avaliacao: 4.7,
    descricao: 'Linhas retas e acetato robusto. Lente polarizada para dirigir.',
    armacao: '#111111', corLente: '#2a2a2a'
  },
  {
    id: 'quadrado-cristal', nome: 'Quadrado Cristal', formato: 'quadrado', publico: 'unissex',
    lente: 'Degradê', preco: 149.9, precoAntigo: 189.9, estoque: 20, vendidos: 52, avaliacao: 4.3,
    descricao: 'Armação transparente com lente verde degradê. Moderno e leve.',
    armacao: '#cfd8dc', corLente: '#2f5a3f'
  },
  {
    id: 'hexagonal-dourado', nome: 'Hexagonal Dourado', formato: 'hexagonal', publico: 'unissex',
    lente: 'Espelhada', preco: 179.9, estoque: 16, vendidos: 29, avaliacao: 4.5, novo: true, selo: 'novo',
    descricao: 'Metal fino dourado com lente espelhada rosé.',
    armacao: '#c9a24a', corLente: '#c96f7a', espelhado: true
  },
  {
    id: 'oversized-tartaruga', nome: 'Oversized Tartaruga', formato: 'oversized', publico: 'feminino',
    lente: 'Degradê', preco: 199.9, precoAntigo: 259.9, estoque: 12, vendidos: 64, avaliacao: 4.7,
    descricao: 'Lentes grandes, cobertura máxima e muita atitude.',
    armacao: '#5a3825', corLente: '#7a4a2b'
  },
  {
    id: 'esportivo-azul', nome: 'Esportivo Azul Espelhado', formato: 'esportivo', publico: 'masculino',
    lente: 'Espelhada', preco: 219.9, estoque: 28, vendidos: 81, avaliacao: 4.6,
    descricao: 'Lente única envolvente para corrida, bike e praia.',
    armacao: '#111111', corLente: '#2b6bd6', espelhado: true
  },
  {
    id: 'esportivo-vermelho', nome: 'Esportivo Fire', formato: 'esportivo', publico: 'unissex',
    lente: 'Espelhada', preco: 209.9, precoAntigo: 239.9, estoque: 10, vendidos: 47, avaliacao: 4.4, selo: 'promo',
    descricao: 'Lente espelhada vermelha e armação leve em nylon.',
    armacao: '#222222', corLente: '#c0392b', espelhado: true
  }
];
