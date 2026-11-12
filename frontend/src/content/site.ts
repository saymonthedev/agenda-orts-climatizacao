/**
 * Conteúdo institucional da ORTS Climatização.
 *
 * Dados de contato (WhatsApp, telefone, endereço, Instagram e horário) NÃO ficam aqui:
 * são preenchidos pelo proprietário em Painel → Configurações → Dados comerciais
 * e aparecem automaticamente no site. Nada foi inventado: o que não foi confirmado
 * em fontes públicas fica oculto até ser cadastrado.
 */

export type SiteImage = { src: string; alt: string; width: number; height: number };

export const images = {
  splitInterno: {
    src: '/images/trabalhos/instalacao-split-interno.jpg',
    alt: 'Ar-condicionado split instalado na parede, acima de uma janela de vidro',
    width: 1220,
    height: 1235,
  },
  condensadora: {
    src: '/images/trabalhos/instalacao-condensadora-varanda.jpg',
    alt: 'Unidade condensadora instalada na varanda, com tubulação protegida e os morros de Jaraguá do Sul ao fundo',
    width: 1220,
    height: 1280,
  },
  filtrosAntes: {
    src: '/images/trabalhos/higienizacao-filtros-antes.jpg',
    alt: 'Filtros de ar-condicionado com acúmulo de poeira, antes da higienização',
    width: 1220,
    height: 597,
  },
  filtrosDepois: {
    src: '/images/trabalhos/higienizacao-filtros-depois.jpg',
    alt: 'Unidade interna aberta com os filtros limpos após a higienização',
    width: 1220,
    height: 647,
  },
  filtrosDetalhe: {
    src: '/images/trabalhos/higienizacao-filtros-depois-detalhe.jpg',
    alt: 'Detalhe dos filtros e da serpentina limpos de um ar-condicionado split',
    width: 1220,
    height: 694,
  },
  splitFinalizado: {
    src: '/images/trabalhos/split-finalizado.jpg',
    alt: 'Ar-condicionado split fechado e funcionando após a manutenção',
    width: 1220,
    height: 612,
  },
} satisfies Record<string, SiteImage>;

export const navigation = [
  { href: '#servicos', label: 'Serviços' },
  { href: '#sobre', label: 'Sobre' },
  { href: '#trabalhos', label: 'Trabalhos' },
  { href: '#atendimento', label: 'Atendimento' },
  { href: '#contato', label: 'Contato' },
] as const;

export type Service = {
  id: string;
  number: string;
  title: string;
  short: string;
  summary: string;
  includes: string[];
  image: SiteImage;
};

/** Serviços evidenciados pelos trabalhos enviados (instalação e higienização/manutenção). */
export const services: Service[] = [
  {
    id: 'instalacao',
    number: '01',
    title: 'Instalação de ar-condicionado',
    short: 'Instalação',
    summary:
      'Posicionamento correto, fixação firme e tubulação com acabamento limpo, para o equipamento render o que promete desde o primeiro dia.',
    includes: [
      'Avaliação do ambiente e do ponto de instalação',
      'Fixação das unidades interna e externa',
      'Tubulação, isolamento e acabamento',
      'Teste de funcionamento e orientações de uso',
    ],
    image: images.condensadora,
  },
  {
    id: 'higienizacao',
    number: '02',
    title: 'Higienização e limpeza',
    short: 'Higienização',
    summary:
      'Limpeza dos filtros e dos componentes internos para remover a poeira e os resíduos acumulados, com ar mais limpo e o aparelho trabalhando com menos esforço.',
    includes: [
      'Limpeza dos filtros de ar',
      'Limpeza da serpentina e da bandeja',
      'Remoção de poeira e resíduos acumulados',
      'Verificação do funcionamento ao final',
    ],
    image: images.filtrosDepois,
  },
  {
    id: 'manutencao',
    number: '03',
    title: 'Manutenção preventiva',
    short: 'Manutenção',
    summary:
      'Revisões periódicas que ajudam a evitar falhas, reduzir ruídos e manter o equipamento eficiente ao longo do ano.',
    includes: [
      'Inspeção geral do equipamento',
      'Limpeza dos filtros e verificação da drenagem',
      'Checagem de ruídos e do funcionamento',
      'Indicação da próxima manutenção',
    ],
    image: images.filtrosAntes,
  },
];

export const differentiators = [
  {
    title: 'Horário marcado',
    text: 'Cada atendimento entra numa agenda organizada, com data e horário combinados com você.',
  },
  {
    title: 'Acabamento cuidadoso',
    text: 'Fixação, tubulação e limpeza do ambiente recebem a mesma atenção que o funcionamento.',
  },
  {
    title: 'Atendimento direto',
    text: 'Conversa pelo WhatsApp do primeiro contato ao pós-serviço, sem intermediários.',
  },
  {
    title: 'Orientação clara',
    text: 'Você entende o que o seu equipamento precisa e por quê, antes de qualquer serviço.',
  },
];

export const processSteps = [
  {
    title: 'Solicitação',
    text: 'Envie uma mensagem com o serviço desejado e o bairro, pelo WhatsApp ou pelo formulário do site.',
  },
  {
    title: 'Agendamento',
    text: 'Data e horário são combinados com você e o atendimento entra na agenda.',
  },
  {
    title: 'Atendimento',
    text: 'No horário marcado, com o equipamento certo, cuidado com o ambiente e limpeza ao final.',
  },
  {
    title: 'Acompanhamento',
    text: 'Você recebe orientações de uso e a indicação de quando fazer a próxima manutenção.',
  },
];

export type GalleryItem = SiteImage & { caption: string; tag: string };

export const gallery: GalleryItem[] = [
  { ...images.splitInterno, caption: 'Split instalado sobre a janela, com acabamento limpo', tag: 'Instalação' },
  { ...images.condensadora, caption: 'Condensadora na varanda, com tubulação protegida', tag: 'Instalação' },
  { ...images.filtrosAntes, caption: 'Filtros com poeira acumulada, antes da higienização', tag: 'Antes' },
  { ...images.filtrosDepois, caption: 'Os filtros depois da higienização', tag: 'Depois' },
  { ...images.filtrosDetalhe, caption: 'Detalhe dos filtros e da serpentina limpos', tag: 'Higienização' },
  { ...images.splitFinalizado, caption: 'Equipamento fechado e pronto para uso', tag: 'Higienização' },
];

export const SITE = {
  name: 'ORTS Climatização',
  city: 'Jaraguá do Sul',
  state: 'SC',
  title: 'ORTS Climatização · Ar-condicionado em Jaraguá do Sul (SC)',
  /** Outras formas de chamar a empresa (ajudam o Google a ligar as buscas ao site). */
  alternateNames: ['ORTS', 'ORTS Climatização Jaraguá do Sul', 'ORTS Climatização Jaraguá'],
  description:
    'Instalação, higienização e manutenção preventiva de ar-condicionado em Jaraguá do Sul (SC). Atendimento com horário marcado, acabamento cuidadoso e contato direto pelo WhatsApp.',
  keywords: [
    'ar-condicionado Jaraguá do Sul',
    'instalação de ar-condicionado',
    'higienização de ar-condicionado',
    'manutenção de ar-condicionado',
    'climatização Jaraguá do Sul',
    'ORTS Climatização',
  ],
};
