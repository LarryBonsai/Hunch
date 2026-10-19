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
Object.assign(buildings, {
  wall: '<path d="m45 153 31-28 28 9 36-52 35 11 29-26 65 20v23l-59-17-29 27-32-9-37 52-28-10-29 27ZM67 133v-21l15-8 14 7v20m34-33V73l18-9 16 9v20m34-20V53l15-7 15 7v23M48 147l28-25 28 10 37-52 35 11 29-25 62 20"/>',
  arena: '<ellipse cx="160" cy="88" rx="102" ry="24"/><path d="M58 88v58c0 32 204 32 204 0V88M58 108c0 32 204 32 204 0M58 128c0 32 204 32 204 0M78 99v54m22-48v54m25-50v54m25-51v53m26-54v53m26-56v54m25-62v54m21-61v53M70 86q90-31 180 0"/>',
  temple: '<path d="M63 160h194M78 153h164v-10H78ZM92 143V91h137v52M82 91l78-42 78 42ZM128 66q32-71 64 0M160 38V24m-9 8h18M106 103v40m18-40v40m72-40v40m18-40v40M143 143v-28q17-21 34 0v28M75 143V70m-10 0h20L75 55Zm170 88V70m-10 0h20l-10-15Z"/>',
  stones: '<path d="M66 158h188M79 157l-4-62 23-4 7 66m-34-68 1-15 39-2 2 17ZM132 157l-2-84 21-1 2 85m17 0-2-85 22-2 4 87M123 71V55l78-1 1 16ZM215 157l-2-62 24-2 4 64m-35-64-1-15 42-2 1 16Z"/>',
  city: '<path d="M55 160h213M65 159V98h40v61m10 0V67h38v92m12 0V42h36v117m11 0V86h44v73M73 110h23m-23 14h23m-23 14h23m27-59h22m-22 14h22m-22 14h22m-22 14h22m-22 14h22m25-77h20m-20 14h20m-20 14h20m-20 14h20m-20 14h20m-20 14h20m-20 14h20m29-42h24m-24 16h24m-24 16h24M60 84h48"/>',
  rock: '<path d="M49 159h222M64 153l13-44 30-15 22-32 45 3 26 28 41 21 17 39ZM79 111l33 6 18-36m44-15-8 60 33 24m2-56-19 25 34 17M88 143l34-7 17 14m-15-47 31 7"/>',
  palace: '<path d="M55 158h213M68 153V95h184v58M60 95l31-18 29 18m79 0 29-18 31 18M132 94V70l28-20 28 20v24M146 78h28m-28 17v59m28-59v59M80 108h12v15H80Zm25 0h12v15h-12Zm98 0h12v15h-12Zm25 0h12v15h-12ZM81 137h35m88 0h35M151 154v-31q9-14 18 0v31M160 49V32l19 6-19 6"/>',
  castle: '<path d="M66 158V80h39v78m110 0V80h39v78M59 80l27-33 27 33m94 0 28-33 27 33M105 148V99h110v49M132 99V69h56v30M126 69l34-26 34 26M79 103h13v17H79Zm148 0h13v17h-13ZM146 158v-32q14-17 28 0v32M60 159h202m-122-55h40M160 42V28l19 5-19 5"/>',
  forest: '<path d="M46 158h228M82 157v-28m-26 0 26-40 26 40Zm6-30 20-32 20 32M146 158v-37m-31 0 31-46 31 46Zm5-32 26-46 26 46M222 158v-29m-28 0 28-42 28 42Zm8-31 20-36 20 36M117 159q18-16 38-9t31 9"/>',
  island: '<path d="M49 150q40-15 71 0t64 0 85 0M60 166q34-10 66 0t68 0 62-1M86 137l33-37 23 18 29-42 55 61ZM111 124l13-7m43-29 12 23 12-7M218 118q-5-28 11-51m-1 0q-30-7-31 15 16-8 31-15Zm0 0q24-14 30 4-15-5-30-4Zm0 0q-15-23 6-25-7 10-6 25Z"/>',
  lake: '<path d="m54 121 43-48 33 36 45-56 77 72M97 76l-8 27 13-6 11 11m62-52-19 42 20-9 13 14M55 135q37-8 73 0t69 0 68 0M75 148q30-6 60 0t58 0 55 0M107 160q23-5 46 0t46 0"/>',
  waterfall: '<path d="M51 83h54l17 11h70l18-11h60M51 99h49l14 14h17v46m15-60v59m22-60v63m18-61v59m9-48h20l15-16h40M51 125h33l21 28m110 0 17-24h38M73 166q28-9 57-1t59 0 56 1M124 119l-4 27m42-40v39m38-22 6 25"/>',
  reef: '<path d="M57 157q38-8 73 0t69 0 65 0M102 153v-45m0 19-19-15V92m0 10-12-9m31 21 19-17V78m-19 55 25-5 13-17M179 154v-36m0 12-18-20V88m18 34 24-18V84m-24 56 26-4 15-16M232 149v-30m0 11-11-10m11 14 15-10M139 70q15-10 30 0l11-8v16l-11-8q-15 10-30 0Z"/>',
  gate: '<path d="M73 159h174M88 156V74m18 82V74m108 82V74m18 82V74M68 73q92 12 184 0V61q-92 12-184 0ZM82 95h156v12H82Zm72-20v20m12-20v20M123 156V118h74v38m-59-38v38m44-38v38M68 55q92 12 184 0"/>',
  geoglyph: '<path d="m60 81 70 21 38-54 22 8-36 57 71-11 38 17-44 5-33 38-19-9 21-27-45 4-28 29-25-4 20-30-51-17Zm80 26 32-40m-10 53 53-5m-90 7-17 25M58 169h207"/>',
  glacier: '<path d="M53 154l23-44 32 12 33-60 32 16 34-30 53 107ZM99 152l18-27 17 12 19-34 16 24 26-47 33 72M141 65l12 38 20-25m34-27-13 29M61 165q30-7 60 0t60 0 76 0"/>',
  cave: '<path d="M57 158l14-67 33-31 50-15 54 23 38 45 19 45ZM95 158l6-41 24-25 34-9 35 17 22 58M118 156l6-30 29-19 25 9 16 40M105 63l9 28 11-33m37-11 10 35 9-27m-53 100 9-21 10 21m21 0 8-18 6 18"/>',
  dune: '<path d="M43 158q79-8 133-101 4 72 99 101M176 57q-1 53-55 101M45 158h230M69 141q34-5 54-21m75 10 35 15M72 110q23-26 54-39M187 80q30 0 58 24"/>'
});
export const ART_KINDS = Object.keys(buildings);
export function illustration(kind = 'eiffel') {
  return `<svg class="landmark" viewBox="0 0 320 185" aria-hidden="true"><defs><pattern id="art-dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="currentColor" opacity=".18"/></pattern></defs><path d="M79 163V94a81 81 0 0 1 162 0v69Z" fill="url(#art-dots)"/><circle cx="217" cy="52" r="20" fill="#d9a969" opacity=".6"/><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${buildings[kind] ?? buildings.eiffel}<path d="M65 165h190" opacity=".35"/></g><path d="m58 53 3-7 3 7 7 3-7 3-3 7-3-7-7-3Z" fill="currentColor" opacity=".5"/></svg>`;
}
