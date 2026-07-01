export const INSPECTION_TOUR_MODULE_SELECTOR = '[data-tour-id="inspection-module"]'

export const INSPECTION_TOUR_ANCHOR_SELECTORS = [
  '[data-tour-id="inspection-nav"]',
  '[data-tour-id="inspection-records"]',
  '[data-tour-id="inspection-scope"]',
  '[data-tour-id="inspection-filters"]',
  '[data-tour-id="inspection-new"]',
]

export const INSPECTION_TOUR_STEPS = [
  {
    key: 'menu',
    title: {
      en: 'Inspection menu',
      bm: 'Menu Pemeriksaan',
    },
    targetSelector: '[data-tour-id="inspection-nav"]',
    fallbackSelector: INSPECTION_TOUR_MODULE_SELECTOR,
    content: {
      en: 'Inspection is where TRT members create and review site inspection records.',
      bm: 'Pemeriksaan ialah tempat ahli TRT mencipta dan menyemak rekod pemeriksaan tapak.',
    },
    placement: 'right',
    mobilePlacement: 'bottom',
  },
  {
    key: 'records',
    title: {
      en: 'Records area',
      bm: 'Bahagian rekod',
    },
    targetSelector: '[data-tour-id="inspection-records"]',
    content: {
      en: 'Your submitted reports and drafts appear here. Use this list to open, edit, download, or follow up on inspection records.',
      bm: 'Laporan yang telah dihantar dan draf anda dipaparkan di sini. Gunakan senarai ini untuk membuka, mengedit, memuat turun atau membuat susulan pada rekod pemeriksaan.',
    },
    placement: 'auto',
    mobilePlacement: 'bottom',
  },
  {
    key: 'scope',
    title: {
      en: 'Scope control',
      bm: 'Kawalan skop',
    },
    targetSelector: '[data-tour-id="inspection-scope"]',
    content: {
      en: 'Switch between your records and the wider team view when your permission allows it.',
      bm: 'Tukar antara rekod anda dan paparan pasukan yang lebih luas apabila kebenaran anda membenarkannya.',
    },
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'filters',
    title: {
      en: 'Filters',
      bm: 'Penapis',
    },
    targetSelector: '[data-tour-id="inspection-filters"]',
    fallbackSelector: '[data-tour-id="inspection-records"]',
    content: {
      en: 'Search, filter by type or status, and narrow records by period.',
      bm: 'Cari, tapis mengikut jenis atau status, dan sempitkan rekod mengikut tempoh.',
    },
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'new',
    title: {
      en: 'New inspection',
      bm: 'Pemeriksaan baharu',
    },
    targetSelector: '[data-tour-id="inspection-new"]',
    content: {
      en: 'Start a new inspection when you are ready to record a location, type, description, and photos.',
      bm: 'Mulakan pemeriksaan baharu apabila anda bersedia untuk merekodkan lokasi, jenis, keterangan dan foto.',
    },
    placement: 'bottom',
    mobilePlacement: 'top',
  },
  {
    key: 'finish',
    title: {
      en: 'Ready to explore',
      bm: 'Sedia untuk diterokai',
    },
    targetSelector: INSPECTION_TOUR_MODULE_SELECTOR,
    content: {
      en: 'You are ready to explore Inspection. You can start a report now or return to records anytime.',
      bm: 'Anda sudah bersedia untuk meneroka Pemeriksaan. Anda boleh memulakan laporan sekarang atau kembali ke rekod pada bila-bila masa.',
    },
    placement: 'center',
    mobilePlacement: 'center',
  },
]
