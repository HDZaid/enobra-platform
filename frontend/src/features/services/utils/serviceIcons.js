export function serviceIconName(text) {
  const item = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const rules = [
    [/electri/, 'Zap'], [/sanitari|agua/, 'Droplets'], [/mecanic|maquinaria|equipo|mantenimiento/, 'Settings'],
    [/topograf/, 'MapPinned'], [/arquitect|dibujo/, 'Ruler'], [/estructur|constructiv|construccion/, 'HardHat'],
    [/material|abastecimiento|compra/, 'Package'], [/transporte/, 'Truck'], [/personal|subcontrat/, 'Users'],
    [/presupuest|caja/, 'Wallet'], [/program|secuencia/, 'CalendarDays'], [/analisis|proyeccion|progreso|monitoreo/, 'ChartNoAxesCombined'],
    [/cambio|modificacion/, 'GitCompareArrows'], [/retroalimentacion/, 'MessageSquare'],
  ];
  return rules.find(([pattern]) => pattern.test(item))?.[1] ?? 'ClipboardCheck';
}
