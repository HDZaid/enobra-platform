import { useId } from 'react';

// Decorative line drawings inspired by colonial stonework and drafting tools.
// They inherit currentColor and stay hidden from assistive technology.

const round = (value) => Number(value.toFixed(1));

function point(cx, cy, radius, degrees) {
  const angle = (degrees * Math.PI) / 180;
  return [round(cx + radius * Math.cos(angle)), round(cy - radius * Math.sin(angle))];
}

function spokes(cx, cy, inner, outer, degrees) {
  return degrees
    .map((angle) => {
      const [x1, y1] = point(cx, cy, inner, angle);
      const [x2, y2] = point(cx, cy, outer, angle);
      return `M${x1} ${y1}L${x2} ${y2}`;
    })
    .join('');
}

const every = (step, from = 0, to = 360) =>
  Array.from({ length: Math.floor((to - from) / step) }, (_, index) => from + index * step);

const circle = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const cross = (x, y, size = 8) => `M${x - size} ${y}H${x + size}M${x} ${y - size}V${y + size}`;
const arch = (cx, springY, r, baseY) =>
  `M${cx - r} ${baseY}V${springY}A${r} ${r} 0 0 1 ${cx + r} ${springY}V${baseY}`;

function keystone(cx, cy, inner, outer, half = 6) {
  const [a, b, c, d] = [
    point(cx, cy, inner, 90 + half),
    point(cx, cy, outer, 90 + half + 1),
    point(cx, cy, outer, 90 - half - 1),
    point(cx, cy, inner, 90 - half),
  ];
  return `M${a.join(' ')}L${b.join(' ')}L${c.join(' ')}L${d.join(' ')}Z`;
}

const dimensionH = (x1, x2, y, tick = 6) =>
  `M${x1} ${y}H${x2}M${x1 - tick} ${y + tick}L${x1 + tick} ${y - tick}M${x2 - tick} ${y + tick}L${x2 + tick} ${y - tick}`;
const dimensionV = (x, y1, y2, tick = 6) =>
  `M${x} ${y1}V${y2}M${x - tick} ${y1 + tick}L${x + tick} ${y1 - tick}M${x - tick} ${y2 + tick}L${x + tick} ${y2 - tick}`;

// Drafting compass: hinge, handle and two legs with a crossbar.
const compass = (x, y, length, spread) =>
  `M${x} ${y - 18}V${y}L${x - spread} ${y + length}M${x} ${y}L${x + spread} ${y + length}` +
  `M${round(x - spread * 0.45)} ${round(y + length * 0.45)}H${round(x + spread * 0.45)}`;

// Isometric cube from its top vertex.
function cube(x, y, size) {
  const c = round(size * 0.866);
  const h = size / 2;
  return (
    `M${x} ${y}L${round(x + c)} ${y + h}V${y + h + size}L${x} ${y + 2 * h + size}` +
    `L${round(x - c)} ${y + h + size}V${y + h}Z` +
    `M${round(x - c)} ${y + h}L${x} ${y + 2 * h}L${round(x + c)} ${y + h}M${x} ${y + 2 * h}V${y + 2 * h + size}`
  );
}

const Draw = ({ d, delay = 0, accent = false }) => (
  <path
    className={`o-draw${accent ? ' o-accent' : ''}`}
    pathLength="1"
    d={d}
    stroke={accent ? '#ff6a1f' : undefined}
    style={{ '--d': `${delay}ms` }}
  />
);
const Detail = ({ d, delay = 900, dashed = false, accent = false }) => (
  <path
    className={`o-detail${dashed ? ' o-dash' : ''}${accent ? ' o-accent' : ''}`}
    d={d}
    strokeDasharray={dashed ? '3 7' : undefined}
    stroke={accent ? '#ff6a1f' : undefined}
    style={{ '--d': `${delay}ms` }}
  />
);

const voussoirs = (cx, cy, inner, outer) =>
  spokes(cx, cy, inner, outer, [15, 30, 45, 60, 75, 105, 120, 135, 150, 165]);

const headerDrawings = {
  // Bienes raíces: planta residencial con patio, circulación central y garaje.
  planta: (
    <>
      <Draw d="M68 80H184V145H320V80H452V436H431M345 436H250M216 436H68V80" />
      <Draw d="M75 87H177V152H327V87H445V429H431M345 429H250M216 429H75V87" delay={90} />
      <Draw
        d="M184 152V178M184 206V234M184 260V303M184 331V397M184 421V429
           M191 152V178M191 206V234M191 260V303M191 331V397M191 421V429
           M75 218H184M75 224H184M75 271H184M75 277H184M75 373H184M75 379H184"
        delay={220}
      />
      <Draw
        d="M327 152V166M327 194V216H445M321 152V166M321 194V222H445
           M321 314H445M321 320H445M321 320V347M321 375V429M327 320V347M327 375V429"
        delay={310}
      />
      <Draw
        d="M191 178H219A28 28 0 0 1 191 206
           M184 234H158A26 26 0 0 0 184 260
           M184 303H156A28 28 0 0 0 184 331
           M184 397H160A24 24 0 0 0 184 421
           M327 166H355A28 28 0 0 1 327 194
           M327 347H355A28 28 0 0 1 327 375"
        delay={450}
      />
      <Draw d="M216 429V395A34 34 0 0 1 250 429" accent delay={550} />

      {/* Ventanas, cotas y acceso desde el frente. */}
      <Detail
        d="M98 80H153V87H98ZM98 83.5H153M362 80H419V87H362ZM362 83.5H419
           M68 110H75V156H68ZM71.5 110V156M68 300H75V343H68ZM71.5 300V343
           M445 245H452V287H445ZM448.5 245V287M227 145H285V152H227ZM227 148.5H285
           M93 429H148V436H93ZM93 432.5H148M345 429V436M431 429V436"
        delay={680}
      />
      <Detail
        d={`${dimensionH(68, 452, 48, 5)}${dimensionV(39, 80, 436, 5)}
           M68 42V73M452 42V73M33 80H61M33 436H61
           M216 443V460H250V443M216 450H250M208 460H258M345 440V456M431 440V456`}
        delay={820}
      />

      {/* Dormitorios, baño y estudio. */}
      <Detail
        d="M91 102H152V176H91ZM91 131H152M97 108H119V124H97ZM124 108H146V124H124Z
           M82 103H89V123H82ZM154 103H171V123H154Z
           M87 284H130V354H87ZM87 308H130M93 289H124V303H93ZM142 284H172V300H142Z
           M82 231H110V262H82ZM87 236H105V257H87ZM117 231H141V244H117Z
           M147 230H172V252H147ZM88 387H141V401H88ZM105 405H126V421H105Z"
        delay={930}
      />

      {/* Cocina, comedor, sala y escalera. */}
      <Detail
        d="M337 94H438V154H420V112H337ZM348 99H367V107H348ZM372 99H391V107H372Z
           M433 127V145M364 135H403V157H364Z
           M365 245H419V283H365ZM372 233H384V241H372ZM400 233H412V241H400Z
           M372 287H384V295H372ZM400 287H412V295H400Z
           M230 216H302V282H230ZM235 221H296V235H235ZM235 235V273H249V235
           M261 245H286V264H261ZM233 290H297
           M264 336H304V408H264ZM264 345H304M264 354H304M264 363H304
           M264 372H304M264 381H304M264 390H304M264 399H304"
        delay={1010}
      />

      {/* Patio con jardineras y dos plazas de estacionamiento. */}
      <Detail
        d={`M196 134V73H308V134M201 84H303M201 104H303M201 124H303
           M214 78V134M234 78V134M274 78V134M294 78V134
           ${circle(247, 98, 11)}${circle(273, 111, 8)}
           M337 326V424M386 326V424M435 326V424
           M349 352Q349 344 356 344H368Q375 344 375 352V401Q375 408 368 408H356Q349 408 349 401Z
           M352 361H372M352 390H372M398 352Q398 344 405 344H417Q424 344 424 352V401Q424 408 417 408H405Q398 408 398 401Z
           M401 361H421M401 390H421`}
        delay={1080}
      />
      <Detail d="M209 455H257M233 470V444M227 450L233 444L239 450" accent delay={1180} />
    </>
  ),
  // Nosotros: fachada con arco, óculo y compás de trazo.
  fachada: (
    <>
      <Detail d={circle(260, 250, 190)} dashed delay={700} />
      <Draw d={arch(260, 250, 150, 520)} />
      <Draw d={arch(260, 250, 118, 520)} delay={150} />
      <Detail d={voussoirs(260, 250, 118, 150)} />
      <Detail d="M96 250H156M364 250H424M96 260H156M364 260H424" />
      <Draw d={keystone(260, 250, 116, 160)} accent delay={600} />
      <Draw d={circle(260, 192, 30)} delay={400} />
      <Detail d={`${spokes(260, 192, 10, 30, every(45))}${circle(260, 192, 10)}`} />
      <Detail d={`${cross(260, 250, 10)}M260 250L${point(260, 250, 190, 28).join(' ')}`} />
      <Detail d={circle(...point(260, 250, 190, 28), 4)} accent />
      <Detail d={`${dimensionH(110, 410, 34)}M110 42V92M410 42V92`} delay={1100} />
      <Detail d={dimensionV(56, 250, 512)} delay={1100} />
      <Draw d={compass(470, 74, 118, 28)} delay={800} />
      <Detail d={`${circle(470, 74, 5)}M498 192A56 56 0 0 1 442 248`} delay={1200} />
    </>
  ),
  // Servicios: trazado con círculo graduado, escuadra, cubo y compás.
  trazado: (
    <>
      <Detail d={circle(330, 200, 190)} dashed delay={700} />
      <Draw d={circle(330, 200, 150)} />
      <Detail d={`${spokes(330, 200, 150, 162, every(15))}${cross(330, 200, 10)}`} />
      <Draw d={compass(405, 70, 130, 75)} delay={500} />
      <Detail d={circle(405, 70, 5)} accent />
      <Draw d="M40 480H240L40 280Z" delay={300} />
      <Detail d="M70 450H170L70 350ZM40 280V250M240 480H270" />
      <Draw d={cube(420, 330, 60)} delay={650} />
      <Detail d={`M420 330V300${circle(420, 330, 3)}`} accent />
      <Detail d={dimensionH(40, 480, 506)} delay={1100} />
    </>
  ),
  // Proyectos: volumetría isométrica con ejes de proyección.
  volumen: (
    <>
      <Detail d={circle(260, 290, 205)} dashed delay={700} />
      <Detail d="M260 20V500M20 480H500" dashed delay={800} />
      <Draw d={cube(190.7, 320, 80)} />
      <Draw d={cube(329.3, 320, 80)} delay={120} />
      <Draw d={cube(260, 280, 80)} delay={240} />
      <Draw d={cube(260, 200, 80)} delay={360} />
      <Draw d={cube(260, 120, 80)} delay={480} />
      <Draw d="M260 120L329.3 160L260 200L190.7 160Z" accent delay={900} />
      <Detail d={`${circle(190.7, 160, 3)}${circle(329.3, 160, 3)}${circle(260, 120, 3)}`} accent />
      <Detail d={`${dimensionV(470, 120, 480)}M450 120H490M450 480H490`} delay={1100} />
      <Draw d={compass(70, 64, 120, 26)} delay={600} />
      <Detail d={`${circle(70, 64, 5)}${cross(460, 40)}${cross(60, 440)}`} />
    </>
  ),
  // Contacto: portal colonial con puerta de dos hojas, pilastras y rosetón.
  portal: (
    <>
      <Detail d={circle(260, 240, 214)} dashed delay={700} />
      <Draw d={arch(260, 240, 138, 520)} />
      <Draw d={arch(260, 240, 120, 520)} delay={150} />
      <Draw d={keystone(260, 240, 118, 158)} accent delay={600} />
      <Detail d={voussoirs(260, 240, 120, 138)} />
      <Draw d={arch(260, 272, 96, 520)} delay={300} />
      <Detail d="M260 176V520M180 300h64v90h-64zM276 300h64v90h-64zM180 410h64v90h-64zM276 410h64v90h-64z" />
      <Draw d="M96 200V520M110 200V520M410 200V520M424 200V520" delay={450} />
      <Detail d="M88 200H118M402 200H432M88 190H118M402 190H432M70 506H450M60 514H460" />
      <Draw d={circle(260, 54, 32)} accent delay={800} />
      <Detail d={`${spokes(260, 54, 10, 32, every(45))}${circle(260, 54, 10)}`} delay={1100} />
      <Detail d={`${cross(260, 240, 10)}${cross(40, 120)}${cross(480, 120)}`} />
    </>
  ),
  // Noticias: rosetón con celosía y compás que traza el círculo mayor.
  roseton: (
    <>
      <Detail d={circle(260, 250, 200)} dashed delay={700} />
      <Draw d={circle(260, 250, 170)} />
      <Draw d={circle(260, 250, 120)} delay={200} />
      <Draw d={circle(260, 250, 60)} accent delay={400} />
      <Detail d={`${spokes(260, 250, 60, 170, every(30))}${circle(260, 250, 20)}`} />
      <Draw
        d={every(30)
          .map((angle) => circle(...point(260, 250, 145, angle), 24))
          .join('')}
        delay={500}
      />
      <Detail d="M90 250L260 80L430 250L260 420ZM140 130H380V370H140Z" delay={1000} />
      <Detail d={cross(260, 250, 12)} accent />
      <Draw d={compass(472, 52, 118, 30)} delay={800} />
      <Detail d={`${circle(472, 52, 5)}${dimensionH(60, 460, 500)}`} delay={1100} />
    </>
  ),
};

export function HeaderOrnament({ variant }) {
  return (
    <div className={`header-drawing header-drawing--${variant}`} aria-hidden="true">
      <svg viewBox="0 0 520 520" focusable="false" preserveAspectRatio="xMidYMax meet">
        {headerDrawings[variant]}
      </svg>
    </div>
  );
}

// Lines laid over published photographs. Corner pieces keep their own viewBox
// so arcs stay circular whatever the image's aspect ratio.
const imageDrawings = {
  frame: (
    <>
      <span className="il-inset" />
      <svg className="il-corner il-tl" viewBox="0 0 120 120" focusable="false">
        <Draw d="M0 100A100 100 0 0 1 100 0M0 72A72 72 0 0 1 72 0" />
        <Detail d={`${spokes(100, 100, 72, 100, [100, 120, 140, 160])}`} />
        <Detail d={circle(100, 100, 3)} accent />
      </svg>
      <svg className="il-corner il-br" viewBox="0 0 90 90" focusable="false">
        <Draw d="M90 30V90H30" />
        <Detail d={`${cross(62, 62, 6)}${circle(62, 62, 12)}`} />
      </svg>
    </>
  ),
  card: (
    <>
      <svg className="il-corner il-tl il-small" viewBox="0 0 60 60" focusable="false">
        <Draw d="M10 54V10H54" />
        <Detail d={circle(10, 10, 3)} accent />
      </svg>
      <svg className="il-corner il-tr" viewBox="0 0 110 110" focusable="false">
        <Draw d="M40 0A70 70 0 0 0 110 70M62 0A48 48 0 0 0 110 48" />
        <Detail d={spokes(110, 0, 48, 70, [190, 210, 230, 250])} />
      </svg>
    </>
  ),
  site: (
    <svg className="il-site" viewBox="0 0 680 220" focusable="false">
      <Detail d="M32 12H648M32 50H648M32 88H648M32 126H648M32 164H648M32 202H648
                 M92 0V220M168 0V220M244 0V220M320 0V220M396 0V220M472 0V220M548 0V220M624 0V220" />
      <Draw d="M70 220L112 126L288 39L480 39L584 98L640 220
               M91 220L128 138L292 57H474L571 109L622 220" />
      <Draw d="M197 220V159H239V119H358V95H451V126H496V220
               M211 220V173H253V133H372V109H437V140H482V220" />
      <Detail d="M253 175H329V133M329 175V220M372 156H437V198H482M256 187H315V220" />
      <Detail d={dimensionH(288, 480, 20, 4) + dimensionV(516, 126, 206, 4)} />
      <Draw d="M239 159V119H358V95" accent />
      <Detail d={circle(239, 159, 3) + circle(358, 95, 3)} accent />
    </svg>
  ),
};

export function ImageLines({ variant }) {
  return (
    <div className={`image-lines image-lines--${variant}`} aria-hidden="true">
      {imageDrawings[variant]}
    </div>
  );
}

// Signage for failures, drawn as unfinished or damaged stonework.
const statusDrawings = {
  // Imagen que no cargó: arco sin clave, grieta y dovela caída.
  image: (
    <>
      <Detail d="M12 12H188V148H12Z" dashed delay={300} />
      <Draw d="M64 148V86A36 36 0 0 1 90.7 51.2" />
      <Draw d="M136 148V86A36 36 0 0 0 109.3 51.2" delay={150} />
      <Detail d="M76 148V86A24 24 0 0 1 93.8 62.8M124 148V86A24 24 0 0 0 106.2 62.8M52 86H64M136 86H148" />
      <Detail d="M100 50L96 62L103 72L98 84" accent />
      <Draw d="M146 140L158 131L167 141L155 149Z" accent delay={700} />
      <Detail d={`${circle(176, 146, 2)}${circle(138, 147, 1.5)}`} />
    </>
  ),
  // Datos que no cargaron: obra detenida, con andamio y señal de alerta.
  error: (
    <>
      <Detail d="M12 150H188" />
      <Draw d="M56 148V88A40 40 0 0 1 96 48" />
      <Detail d="M96 48A40 40 0 0 1 136 88V148" dashed />
      <Detail d="M150 60V148M180 60V148M150 84H180M150 112H180M150 140H180M150 84L180 112M150 112L180 140" />
      <Draw d={compass(30, 34, 52, 13)} delay={300} />
      <Detail d={circle(30, 34, 3)} />
      <Draw d="M96 94L110 108L96 122L82 108Z" accent delay={500} />
      <Detail d="M96 100V110M96 114V115" accent />
    </>
  ),
  // Enlace roto: una ruta sale del terreno y se detiene fuera del plano.
  notfound: (
    <>
      <path
        d="M12 118H189M12 92H189M12 66H189M12 40H189M36 19V144M62 19V144
           M88 19V144M114 19V144M140 19V144M166 19V144"
        strokeOpacity=".18"
      />
      <Detail d="M26 28H136V48H154V130H26Z" dashed delay={200} />
      <Draw d="M43 111V45H104V62H128V112H100M82 112H43" />
      <Draw d="M48 106V50H99V67H123V106H100M82 106H48
               M72 50V70M72 85V106M48 85H72M99 85V106M99 67H123" delay={140} />
      <Detail d="M72 70H87A15 15 0 0 1 72 85M82 106V88A18 18 0 0 1 100 106" />
      <Detail d={dimensionH(26, 154, 143, 4) + cross(26, 28, 4)} />
      <Detail d="M91 118V124Q91 135 102 135H157Q174 135 174 118V76" accent dashed delay={420} />
      <Draw d="M174 75C170 70 164 64 164 58A10 10 0 0 1 184 58C184 64 178 70 174 75Z" accent delay={600} />
      <Detail d={circle(174, 58, 3)} accent delay={750} />
    </>
  ),
};

export function StatusDrawing({ variant, className = '' }) {
  return (
    <svg
      className={`status-drawing status-drawing--${variant} ${className}`}
      viewBox="0 0 200 160"
      width="150"
      height="120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      aria-hidden="true"
      focusable="false"
    >
      {statusDrawings[variant]}
    </svg>
  );
}

// Small inline mark for one-line status notices.
export function BrokenArchMark() {
  return (
    <svg
      className="broken-arch-mark"
      viewBox="0 0 22 18"
      width="22"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 17V9A8 8 0 0 1 9.4 1.2M19 17V9A8 8 0 0 0 12.6 1.2" />
      <path d="M11 3L10 7L11.6 9" stroke="#ff6a1f" />
    </svg>
  );
}

const CENTER = 200;
const SPRING = 200;

function radial(inner, outer, degrees) {
  const [x1, y1] = point(CENTER, SPRING, inner, degrees);
  const [x2, y2] = point(CENTER, SPRING, outer, degrees);
  return `M${x1} ${y1}L${x2} ${y2}`;
}

// Voussoir joints every 15°, leaving the crown free for the keystone.
const archVoussoirs = [15, 30, 45, 60, 75, 105, 120, 135, 150, 165]
  .map((degrees) => radial(118, 150, degrees))
  .join('');
const archKeystone = [
  point(CENTER, SPRING, 116, 84),
  point(CENTER, SPRING, 160, 83),
  point(CENTER, SPRING, 160, 97),
  point(CENTER, SPRING, 116, 96),
]
  .map(([x, y], index) => `${index ? 'L' : 'M'}${x} ${y}`)
  .join('');

export function ArchOrnament({ className = '' }) {
  return (
    <svg
      className={`colonial-arch ${className}`}
      viewBox="0 0 400 520"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
    >
      <path className="arch-line arch-outer" pathLength="1" d="M50 520V200A150 150 0 0 1 350 200V520" />
      <path className="arch-line arch-inner" pathLength="1" d="M82 520V200A118 118 0 0 1 318 200V520" />
      <path className="arch-detail" d={archVoussoirs} />
      <path className="arch-detail" d="M34 200H98M302 200H366M34 210H98M302 210H366M40 488H92M308 488H360" />
      <path className="arch-key" d={`${archKeystone}Z`} />
    </svg>
  );
}

export function FooterElevation() {
  return (
    <svg className="footer-elevation" viewBox="0 0 640 220" aria-hidden="true" focusable="false">
      <g className="footer-elevation-guides">
        <Detail d="M16 181H624M32 108H609M73 13V212M320 13V212M563 13V212" dashed />
        <Detail d={dimensionH(73, 320, 201, 4) + dimensionH(320, 563, 201, 4)} />
        <Detail d={dimensionV(600, 46, 181, 4) + cross(32, 108, 4) + cross(563, 32, 4)} />
        <Detail d="M73 181V207M320 181V207M563 181V207M555 46H607M563 181H607" />
      </g>
      {/* Colonial facade with a tile roof, a central arch and flanking windows. */}
      <Draw d="M73 181V98M320 181V98M56 98L186 47L335 98ZM74 91H315
               M68 102H324M80 174H159M221 174H313M42 181H591" />
      <Detail d="M89 85H292M108 78H272M126 71H252M146 64H231
                 M126 92L140 85M173 92L177 85M219 92L216 85M265 92L256 85
                 M151 78L160 71M189 78V71M226 78L218 71M173 64L180 57M207 64L199 57" />
      <Draw d={arch(190, 146, 31, 181) + arch(190, 146, 23, 181)} />
      <Detail d={voussoirs(190, 146, 23, 31) + 'M190 123V181M167 151H213M148 146H159M221 146H232'} />
      <Draw d="M101 119H134V161H101ZM245 119H278V161H245Z" />
      <Detail d="M96 165H139M240 165H283M117.5 119V161M261.5 119V161M101 140H134M245 140H278" />
      {/* Modern facade with overlapping volumes, glazing and a slatted screen. */}
      <Draw d="M320 181V122H357V46H555V109H578V181
               M347 46H568V54H357M357 70H555M342 109H578V117H342Z
               M344 181V130H469V181M487 181V130H557V181" />
      <Detail d="M373 70V109M407 70V109M440 70V109M473 70V109M506 70V109M539 70V109
                 M386 130V181M427 130V181M344 139H469M487 139H557
                 M497 139V181M507 139V181M517 139V181M527 139V181M537 139V181M547 139V181" />
      <Draw d="M357 109V46H402" accent />
      <Detail d={circle(357, 46, 3)} accent />
    </svg>
  );
}

export function AshlarRule({ className = '' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`ashlar-rule ${className}`} height="14" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${id}-course`} width="96" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 .5H96M0 7H96M0 13.5H96M.5 0V7M48 7V14" />
        </pattern>
      </defs>
      <rect width="100%" height="14" fill={`url(#${id}-course)`} />
    </svg>
  );
}

export function ArchMark() {
  return (
    <svg
      className="arch-mark"
      viewBox="0 0 40 48"
      width="34"
      height="41"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 47V20A16 16 0 0 1 36 20V47M10 47V20A10 10 0 0 1 30 20V47M18 3.5h4l-.6 6.5h-2.8Z" />
    </svg>
  );
}
