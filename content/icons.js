// İnce çizgili (line art) ikonlar. 24x24 görünüm alanı, renk CSS'ten (currentColor) gelir.
const wrap = (inner, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

const raw = {
  // Adalet tokmağı
  gavel: '<path d="m14.5 12.5-8 8a2.12 2.12 0 1 1-3-3l8-8"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>',
  // Rulo parşömen ve kalem
  scroll: '<path d="M16 3H5.5a2.5 2.5 0 0 0 0 5H8"/><path d="M5.5 3A2.5 2.5 0 0 1 8 5.5V19a2 2 0 0 0 2 2h8.5a2.5 2.5 0 0 0 0-5H12"/><path d="M11 9h4M11 12h2.5"/><path d="M21.6 4.4a1.4 1.4 0 0 0-2-2l-5.1 5.1-.6 2.6 2.6-.6z"/>',
  // Ucu açılmış asma kilit
  lockOpen: '<rect x="4" y="11" width="16" height="11" rx="2"/><path d="M8 11V7a5 5 0 0 1 9.9-1"/><circle cx="12" cy="15.6" r="1.3"/><path d="M12 17v2"/>',
  // Tokalaşan iki el
  handshake: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/>',
  // Evrak çantası
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M2 13h20"/>',
  // Ev silüeti
  house: '<path d="M15 21v-7a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v7"/><path d="M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  // Sütunlu klasik kamu binası
  landmark: '<path d="M3 22h18"/><path d="M4 18.5h16"/><path d="M6 18.5v-7.5M10 18.5v-7.5M14 18.5v-7.5M18 18.5v-7.5"/><path d="M4 11h16"/><path d="M12 2.5 20.5 8h-17z"/>',
  // Soy ağacı
  tree: '<circle cx="12" cy="4" r="2"/><path d="M12 6v4"/><path d="M5 14v-4h14v4"/><path d="M12 10v4"/><circle cx="5" cy="16" r="2"/><circle cx="12" cy="16" r="2"/><circle cx="19" cy="16" r="2"/><path d="M19 18v2.5M17 20.5h4"/>',
  // İç içe geçmiş iki alyans
  rings: '<circle cx="9" cy="14" r="6"/><circle cx="15" cy="14" r="6"/><path d="M13.6 4.2 15 2.6l1.4 1.6L15 6z"/><path d="M15 6v1.6"/>',
  // Otel resepsiyon zili
  bell: '<path d="M3 20a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1Z"/><path d="M20 16a8 8 0 1 0-16 0"/><path d="M12 4v4"/><path d="M10 4h4"/>',
  // Büyüteçli evrak
  fileSearch: '<path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M4.3 21a2 2 0 0 0 1.7 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3"/><path d="m9 18-1.5-1.5"/><circle cx="5" cy="14" r="3"/>',

  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-9 5.7a2 2 0 0 1-2 0L2 7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  scales: '<path d="M12 3v18"/><path d="M7.5 21h9"/><path d="M4.5 7h15"/><path d="M12 4.5a1 1 0 1 0 0-.01"/><path d="M5 7 2 14a3.2 3.2 0 0 0 6 0z"/><path d="m19 7-3 7a3.2 3.2 0 0 0 6 0z"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>'
};

const icon = (name, cls) => wrap(raw[name] || '', cls);
module.exports = { icon, raw };
