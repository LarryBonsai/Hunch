export const icons = {
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  time: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  chart: '<path d="M4 20h17M7 16V9m5 7V4m5 12v-5"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trophy: '<path d="M7 3h10v7a5 5 0 0 1-10 0ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v6m-5 0h10"/>',
  door: '<path d="M13 4H4v16h9m1-12 4 4-4 4m-6-4h13"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>'
};
export const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.globe}</svg>`;
const buildings = {
  eiffel: '<path d="M116 158h88M126 157l22-50 8-53 2-25h4l2 25 8 53 22 50M139 132h42M146 108h28M151 82h18M153 61h14M148 109l26 23m-2-23-26 23M141 132l34-1m-38 13 44-1M143 157q17-40 34 0"/>',
  pyramids: '<path d="m31 155 58-66 61 66Z" fill="currentColor" fill-opacity=".035"/><path d="m89 89 13 66h48Z" fill="currentColor" fill-opacity=".08"/><path d="m85 159 76-110 84 110Z" fill="currentColor" fill-opacity=".04"/><path d="m161 49 18 110h66Z" fill="currentColor" fill-opacity=".13"/><path d="m211 159 37-49 43 49Z" fill="currentColor" fill-opacity=".04"/><path d="m248 110 8 49h35Z" fill="currentColor" fill-opacity=".1"/><path d="m143 77 24 1m-35 15 37 1m-49 16 52 1m-65 17 69 1m-81 17 84 1" opacity=".22"/><path d="M42 170q43-8 81-1t76-1 78 2" opacity=".3"/>',
  tower: '<path d="M122 159h76M134 157v-41h9V88h8V59h7V23h4v49h8v29h8v31h8v25M143 116v42m8-70v70m7-99v99m12-57v57m8-26v26M134 132h9m8-18h7m12 22h8"/>',
  bridge: '<path d="M54 153h214M56 134h210M95 160V73h10v87m103 0V73h10v87M62 94q36 84 98 6 37 65 100-5M100 79q59 87 113 0M77 113v21m45-27v27m22-11v11m20-11v11m21-18v18m53-14v14m13-19v19M95 86h10m103 0h10"/>',
  opera: '<path d="M62 158h201M80 148h158l14 10H70Z M91 145q-1-51-27-68 51 4 76 68M119 145q12-67 6-96 42 45 46 96M159 145q12-53 49-78-12 41 6 78M206 145q11-36 40-46-9 32-9 46M77 92l50 53m2-80 25 80m47-58-24 58"/>',
  statue: '<path d="M126 160h68l-6-15h-56ZM142 144l6-60 10-8h13l9 67M157 76l-9-19-19-24-7 5 16 32 10 26M129 34l-6-14m-7 9h14M163 57v16m-8-17 8-13 10 13Z M151 51l-4-7m13-3v-9m10 10 5-7m-18 43 14 14 15-8 8 17-16 12-15-12m-7 0-4 35m14-22 4 28"/>',
  mountain: '<path d="m57 158 64-77 24 30 36-69 81 116ZM120 84l-12 30 14-7 17 18m42-79-22 48 16-10 12 14 10-7 19 25M91 158l23-18h44v18m-31-18v-13h48v13m-20-13v-12h34v25m-60 8h20m8 0h26"/>',
  canyon: '<path d="M54 99h53l14 21h24l7 17h18l20-32h23l17-17h34M54 119h43l18 20 15 20m24 1 19-12 15-26h29l21-18h26M54 139h31l20 21m91 0 16-20h23l15-16h14M74 100V78m-9 10h18M54 160h69m48 0h94"/>',
  canal: '<path d="M57 77h66v82H57m140-82h65m-65 0v82h65M123 102h74m-74 28h74M69 95h39m-39 16h39m101-18h38m-38 18h38M135 116h48l-8 9h-32ZM151 114V98h16v16m-8-16v-9M139 148q10-6 20 0t20 0M65 142q10-6 20 0t20 0m108 0q10-6 20 0t20 0"/>',
  christ: '<path d="M118 160h84l-9-14h-66ZM146 145l7-54-46-7v-9l51-1h7l48 1v9l-44 8 8 53M157 55q5-6 10 0v13q-5 6-10 0ZM153 92l10 14 6-14m-6 15v37m-12-9h25M84 160l37-28 21 9m37 1 25-18 30 36"/>'
};
export function illustration(kind = 'eiffel') {
  return `<svg class="landmark" viewBox="0 0 320 185" aria-hidden="true"><defs><pattern id="art-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="currentColor" opacity=".18"/></pattern></defs><path d="M79 163V94a81 81 0 0 1 162 0v69Z" fill="url(#art-dots)"/><circle cx="217" cy="52" r="20" fill="#d9a969" opacity=".6"/><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${buildings[kind] ?? buildings.eiffel}<path d="M65 165h190" opacity=".35"/></g><path d="m58 53 3-7 3 7 7 3-7 3-3 7-3-7-7-3Z" fill="currentColor" opacity=".5"/></svg>`;
}
