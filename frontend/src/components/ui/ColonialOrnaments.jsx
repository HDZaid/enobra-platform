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
  arcade: (
    <svg className="il-arcade" viewBox="0 0 1200 170" preserveAspectRatio="xMidYMax slice" focusable="false">
      <Detail d="M0 24H1200M0 32H1200" />
      <Draw
        d={every(150, 0, 1200)
          .map((x) => arch(x + 75, 105, 55, 170))
          .join('')}
      />
      <Detail
        d={every(150, 0, 1200)
          .map((x) => `${arch(x + 75, 105, 45, 170)}M${x} 170V40`)
          .join('')}
      />
      <Detail
        d={every(150, 0, 1200)
          .map((x) => keystone(x + 75, 105, 44, 62, 8))
          .join('')}
        accent
      />
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
  // Enlace roto: plano desarmado, con una mitad desplazada y la clave suelta.
  notfound: (
    <>
      <Detail d={circle(100, 90, 64)} dashed delay={300} />
      <Draw d="M58 150V90A42 42 0 0 1 92.7 48.6" />
      <Draw d="M150 158V98A42 42 0 0 0 115.3 56.6" delay={150} />
      <Detail d="M46 90H58M150 98H162M72 150V90A28 28 0 0 1 95.1 62.4" />
      <Draw d="M88 18L100 10L110 20L98 28Z" accent delay={600} />
      <Detail d="M99 32V42" dashed accent />
      <Detail d={`${cross(26, 26)}${cross(176, 36)}${dimensionH(20, 52, 156)}`} />
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

export function AshlarRule({ className = '', brand = false }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={`ashlar-rule ${className}`} height="14" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${id}-course`} width="96" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 .5H96M0 7H96M0 13.5H96M.5 0V7M48 7V14" />
        </pattern>
        {brand && (
          <linearGradient id={`${id}-fade`}>
            <stop offset="0" stopColor="#fff" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        )}
        {brand && (
          <mask id={`${id}-mask`}>
            <rect width="100%" height="14" fill={`url(#${id}-fade)`} />
          </mask>
        )}
      </defs>
      <rect
        width="100%"
        height="14"
        fill={`url(#${id}-course)`}
        mask={brand ? `url(#${id}-mask)` : undefined}
      />
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
