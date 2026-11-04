export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type PlayerRole = 'P1' | 'P2';
export type OwnerTag = 'NONE' | 'P1' | 'P2';

export type TileType =
  | 'WALL'
  | 'FLOOR'
  | 'PLATE'
  | 'ICE'
  | 'EXIT'
  | 'EXIT_P1'
  | 'EXIT_P2'
  | 'BARRIER_P1'
  | 'BARRIER_P2'
  | 'SPIKE_OFF'
  | 'SPIKE_ON'
  | 'TELEPORTER';

export type MirrorAngle = 'SLASH' | 'BACKSLASH'; // '/' or '\'

export type SentinelArchetype =
  | 'PATROL_GOLEM'   // Archetype 1: Patrols along corridor, charges when obstructed/windup
  | 'GAZE_TURRET'    // Archetype 2: Rotates 90 deg every 2 turns, fires beam along line-of-sight after windup
  | 'MIMIC_WRAITH';  // Archetype 3: Stalks toward player via Manhattan path, pauses every 3rd turn for AoE windup

export interface BlockEntity {
  id: string;
  x: number;
  y: number;
  kind: 'RUNE' | 'MIRROR';
  mirrorAngle?: MirrorAngle;
  owner?: OwnerTag;
}

export interface EmitterEntity {
  id: string;
  x: number;
  y: number;
  dir: Direction;
}

export interface CrystalEntity {
  id: string;
  x: number;
  y: number;
  powered: boolean;
}

export interface SentinelEntity {
  id: string;
  x: number;
  y: number;
  archetype: SentinelArchetype;
  dir: Direction;
  alive: boolean;
  stepCounter: number;
  windupActive: boolean;
  windupTargetTiles: { x: number; y: number }[];
}

export interface LevelDefinition {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  mechanicHint: string;
  parMoves: number;
  isCoop?: boolean;
  grid: string[];
  blocks: Omit<BlockEntity, 'id'>[];
  emitters: Omit<EmitterEntity, 'id'>[];
  crystals: { x: number; y: number }[];
  sentinels: Omit<SentinelEntity, 'id' | 'alive' | 'stepCounter' | 'windupActive' | 'windupTargetTiles'>[];
  hintSequence: Direction[];
  hintText: string;
}

export const LEVELS: LevelDefinition[] = [
  {
    id: 1,
    code: 'MÀN 01',
    title: 'Khởi Nguyên Cổ Tự',
    subtitle: 'Đẩy khối Đá Rune lên Phiến Ấn Cổ để mở Cổng Không Gian.',
    mechanicHint: 'Dùng WASD hoặc Phím Mũi Tên để đẩy Khối Đá Vàng vào đúng ô Ấn Cổ phát sáng.',
    parMoves: 9,
    grid: [
      '#########',
      '#.......#',
      '#.P..O.E#',
      '#.......#',
      '#########',
    ],
    blocks: [
      { x: 3, y: 2, kind: 'RUNE' },
    ],
    emitters: [],
    crystals: [],
    sentinels: [],
    hintSequence: ['RIGHT', 'RIGHT', 'UP', 'RIGHT', 'RIGHT', 'RIGHT', 'DOWN'],
    hintText: 'Đẩy thẳng Khối Đá Rune sang phải 2 bước vào ô Ấn Cổ, sau đó vòng lên trên để bước vào Cổng Cổ Đài.',
  },
  {
    id: 2,
    code: 'MÀN 02',
    title: 'Hành Lang Băng Giá',
    subtitle: 'Mặt băng trơn trượt khiến cả bạn và khối đá trượt tới tận vật cản.',
    mechanicHint: 'Khối đá đẩy lên mặt băng (màu xanh lam) sẽ trượt một mạch cho đến khi chạm tường hoặc khối khác.',
    parMoves: 8,
    grid: [
      '##########',
      '#..#.....#',
      '#P...IIIO#',
      '#....#..E#',
      '##########',
    ],
    blocks: [
      { x: 2, y: 2, kind: 'RUNE' },
    ],
    emitters: [],
    crystals: [],
    sentinels: [],
    hintSequence: ['RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'DOWN', 'RIGHT'],
    hintText: 'Đẩy Khối Đá Rune sang phải 3 bước để đá trượt qua dải băng đè lên Ấn Cổ (8,2), rồi trượt theo và bước xuống Cổng (8,3).',
  },
  {
    id: 3,
    code: 'MÀN 03',
    title: 'Lăng Kính Ánh Sáng',
    subtitle: 'Đẩy gương lăng kính đón tia laser cổ đại chiếu vào Tinh Thể Thu.',
    mechanicHint: 'Đưa Gương Lăng Kính vào đúng đường truyền của tia laser để khúc xạ ánh sáng 90 độ.',
    parMoves: 10,
    grid: [
      '#########',
      '#.......#',
      '#P.....E#',
      '#.......#',
      '#########',
    ],
    blocks: [
      { x: 4, y: 2, kind: 'MIRROR', mirrorAngle: 'BACKSLASH' },
    ],
    emitters: [
      { x: 4, y: 0, dir: 'DOWN' },
    ],
    crystals: [
      { x: 7, y: 1 },
    ],
    sentinels: [],
    hintSequence: ['DOWN', 'RIGHT', 'RIGHT', 'RIGHT', 'UP', 'RIGHT', 'RIGHT', 'RIGHT'],
    hintText: 'Đi vòng xuống dưới cột 4 rồi đẩy Gương Lăng Kính lên ô (4,1) để khúc xạ tia laser sang Tinh Thể (7,1), sau đó sang phải vào Cổng.',
  },
  {
    id: 4,
    code: 'MÀN 04',
    title: 'Vệ Binh Thức Giấc',
    subtitle: 'Dùng tia sáng cổ đại hóa giải Tuần Binh Đá đang canh giữ lối đi.',
    mechanicHint: 'Đứng cạnh Gương Lăng Kính và nhấn [Space] để xoay góc gương 90°, chiếu tia laser tiêu diệt Tuần Binh.',
    parMoves: 11,
    grid: [
      '##########',
      '#P.......#',
      '#......O.#',
      '#......E.#',
      '##########',
    ],
    blocks: [
      { x: 3, y: 1, kind: 'MIRROR', mirrorAngle: 'SLASH' },
      { x: 5, y: 2, kind: 'RUNE' },
    ],
    emitters: [
      { x: 3, y: 0, dir: 'DOWN' },
    ],
    crystals: [],
    sentinels: [
      { x: 7, y: 1, archetype: 'PATROL_GOLEM', dir: 'LEFT' },
    ],
    hintSequence: ['RIGHT', 'DOWN', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT'],
    hintText: 'Bước sang phải tới (2,1) rồi nhấn [Space] để xoay Gương sang góc \\ tiêu diệt Tuần Binh, sau đó xuống hàng 2 đẩy Đá Rune vào Ấn Cổ (7,2).',
  },
  {
    id: 5,
    code: 'MÀN 05',
    title: 'Giao Lộ Phản Chiếu',
    subtitle: 'Kết hợp hai gương lăng kính và phiến đá để mở khóa đồng thời.',
    mechanicHint: 'Cổng Cổ Đài chỉ mở khi TẤT CẢ Phiến Ấn Cổ đều có đá đè lên VÀ mọi Tinh Thể đều nhận tia laser.',
    parMoves: 14,
    grid: [
      '###########',
      '#P........#',
      '#..O.#....#',
      '#....#...E#',
      '###########',
    ],
    blocks: [
      { x: 2, y: 2, kind: 'RUNE' },
      { x: 6, y: 2, kind: 'MIRROR', mirrorAngle: 'SLASH' },
      { x: 8, y: 2, kind: 'MIRROR', mirrorAngle: 'BACKSLASH' },
    ],
    emitters: [
      { x: 6, y: 0, dir: 'DOWN' },
    ],
    crystals: [
      { x: 8, y: 3 },
    ],
    sentinels: [],
    hintSequence: ['DOWN', 'RIGHT', 'UP', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT'],
    hintText: 'Xuống (1,2) đẩy Đá Rune vào Ấn Cổ (3,2). Sau đó lên hành lang trên tới (6,1), nhấn [Space] xoay gương (6,2) để nối tia sáng qua gương (8,2) xuống Tinh Thể (8,3).',
  },
  {
    id: 6,
    code: 'MÀN 06',
    title: 'Mắt Thần Canh Gác',
    subtitle: 'Dùng khối Đá Rune làm lá chắn che tầm nhìn của Tượng Mắt Thần.',
    mechanicHint: 'Tượng Mắt Thần xoay 90° mỗi 2 lượt và khóa mục tiêu khi thấy bạn. Khối đá sẽ chặn hoàn toàn tầm nhìn của nó.',
    parMoves: 12,
    grid: [
      '###########',
      '#P........#',
      '#.......O.#',
      '#.......E.#',
      '###########',
    ],
    blocks: [
      { x: 3, y: 2, kind: 'RUNE' },
    ],
    emitters: [],
    crystals: [],
    sentinels: [
      { x: 5, y: 1, archetype: 'GAZE_TURRET', dir: 'DOWN' },
    ],
    hintSequence: ['DOWN', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'DOWN', 'RIGHT'],
    hintText: 'Đi xuống hàng 2 rồi đẩy Khối Đá Rune đi ngang qua trước mặt Tượng Mắt Thần (5,1) để che tia nhìn và đưa đá tới ô Ấn Cổ (8,2).',
  },
  {
    id: 7,
    code: 'MÀN 07',
    title: 'Cổng Dịch Chuyển',
    subtitle: 'Đẩy khối đá xuyên qua Cổng Dịch Chuyển Kép sang bờ bên kia.',
    mechanicHint: 'Khi đẩy khối đá hoặc bước vào ô Dịch Chuyển (T), vật thể sẽ xuất hiện ở cổng (T) còn lại theo cùng hướng đi.',
    parMoves: 8,
    grid: [
      '###########',
      '#P..T.#...#',
      '#.....#TIO#',
      '#.....#..E#',
      '###########',
    ],
    blocks: [
      { x: 2, y: 1, kind: 'RUNE' },
    ],
    emitters: [],
    crystals: [],
    sentinels: [],
    hintSequence: ['RIGHT', 'RIGHT', 'RIGHT', 'DOWN', 'RIGHT'],
    hintText: 'Đẩy Khối Đá Rune sang phải vào Cổng Dịch Chuyển (4,1); đá sẽ xuất hiện ở bên kia và trượt băng vào Ấn Cổ (9,2). Bước theo qua cổng rồi xuống Cổng (9,3).',
  },
  {
    id: 8,
    code: 'MÀN 08',
    title: 'Bẫy Gai & Bóng Ma',
    subtitle: 'Xoay gương phóng tia sáng tiêu diệt Bóng Ma Cổ Tự đang rình rập.',
    mechanicHint: 'Bóng Ma Cổ Tự luôn đuổi theo bạn mỗi lượt. Hãy xoay gương ngay lượt đầu để tia laser quét ngang tiêu diệt Bóng Ma.',
    parMoves: 13,
    grid: [
      '###########',
      '#P........#',
      '#......O..#',
      '#........E#',
      '###########',
    ],
    blocks: [
      { x: 2, y: 1, kind: 'MIRROR', mirrorAngle: 'SLASH' },
      { x: 4, y: 2, kind: 'RUNE' },
    ],
    emitters: [
      { x: 2, y: 0, dir: 'DOWN' },
    ],
    crystals: [],
    sentinels: [
      { x: 8, y: 1, archetype: 'MIMIC_WRAITH', dir: 'LEFT' },
    ],
    hintSequence: ['DOWN', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT'],
    hintText: 'Nhấn [Space] ngay tại vị trí xuất phát để xoay Gương (2,1) thành \\, phóng tia laser tiêu diệt Bóng Ma ở (8,1), rồi xuống đẩy Đá Rune vào Ấn Cổ (7,2).',
  },
  {
    id: 9,
    code: 'MÀN 09',
    title: 'Mê Cung Băng Quang',
    subtitle: 'Trượt gương trên mặt băng để bắt sóng ánh sáng vào Tinh Thể.',
    mechanicHint: 'Gương Lăng Kính cũng trượt trên mặt băng! Hãy trượt gương vào vị trí đón tia laser rồi đẩy Đá Rune vào Ấn Cổ.',
    parMoves: 13,
    grid: [
      '###########',
      '#P.IIII...#',
      '#.......O.#',
      '#........E#',
      '###########',
    ],
    blocks: [
      { x: 2, y: 1, kind: 'MIRROR', mirrorAngle: 'BACKSLASH' },
      { x: 5, y: 2, kind: 'RUNE' },
    ],
    emitters: [
      { x: 7, y: 0, dir: 'DOWN' },
    ],
    crystals: [
      { x: 9, y: 1 },
    ],
    sentinels: [],
    hintSequence: ['RIGHT', 'DOWN', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT'],
    hintText: 'Đẩy Gương ở (2,1) sang phải để nó trượt qua dải băng dừng ngay tại (7,1) dưới đầu phát laser, phản chiếu tia sáng vào Tinh Thể (9,1), rồi đẩy Đá Rune vào Ấn Cổ (8,2).',
  },
  {
    id: 10,
    code: 'MÀN 10',
    title: 'Đại Điện Vĩnh Hằng',
    subtitle: 'Thử thách tối thượng kết hợp Băng Trượt, Lăng Kính và Vệ Binh.',
    mechanicHint: 'Xoay gương nạp năng lượng cho Tinh Thể, sau đó đẩy Đá Rune trượt qua băng nghiền nát Vệ Binh và tiến vào Ấn Cổ.',
    parMoves: 14,
    grid: [
      '############',
      '#P.........#',
      '#...IIII.O.#',
      '#.........E#',
      '############',
    ],
    blocks: [
      { x: 3, y: 2, kind: 'RUNE' },
      { x: 4, y: 1, kind: 'MIRROR', mirrorAngle: 'SLASH' },
    ],
    emitters: [
      { x: 4, y: 0, dir: 'DOWN' },
    ],
    crystals: [
      { x: 10, y: 1 },
    ],
    sentinels: [
      { x: 6, y: 2, archetype: 'PATROL_GOLEM', dir: 'LEFT' },
    ],
    hintSequence: ['RIGHT', 'RIGHT', 'LEFT', 'DOWN', 'RIGHT', 'RIGHT', 'RIGHT'],
    hintText: 'Đi sang (3,1) nhấn [Space] xoay Gương (4,1) chiếu tia laser vào Tinh Thể (10,1). Sau đó xuống (2,2) đẩy Khối Đá Rune trượt băng húc văng Vệ Binh và đẩy tiếp vào Ấn Cổ (9,2).',
  },
  // ===========================================================================
  // CO-OP MULTIPLAYER CAMPAIGN (STAGES 11 - 15)
  // ===========================================================================
  {
    id: 11,
    code: 'CO-OP 01',
    title: 'Cổng Đôi Nguyên Tố',
    subtitle: 'Hai Pháp Sư Lục Bảo (P1) và Lam Tinh (P2) mở Rào Chắn và Cổng Đôi riêng.',
    mechanicHint: 'P1 (Xanh Lục) chỉ đi qua Rào Chắn & Khối Đá Lục Bảo; P2 (Xanh Lam) tương tác với Lam Tinh. Cả hai phải đứng trên đúng Cổng A và B để qua màn!',
    parMoves: 16,
    isCoop: true,
    grid: [
      '##########',
      '#P..1..O.#',
      '#Q..2..O.#',
      '#......AB#',
      '##########',
    ],
    blocks: [
      { x: 2, y: 1, kind: 'RUNE', owner: 'P1' },
      { x: 2, y: 2, kind: 'RUNE', owner: 'P2' },
    ],
    emitters: [],
    crystals: [],
    sentinels: [],
    hintSequence: ['RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'RIGHT'],
    hintText: 'P1 đẩy Đá Lục Bảo qua Rào Chắn Lục (4,1) vào Ấn Cổ (7,1); P2 đẩy Đá Lam Tinh qua Rào Chắn Lam (4,2) vào Ấn Cổ (7,2). Sau đó P1 đứng vào Cổng A (7,3) và P2 đứng vào Cổng B (8,3).',
  },
  {
    id: 12,
    code: 'CO-OP 02',
    title: 'Giao Khúc Lục Lam',
    subtitle: 'Truyền tia sáng qua Gương Lục Bảo của P1 sang Gương Lam Tinh của P2.',
    mechanicHint: 'Gương viền Lục chỉ P1 xoay được; Gương viền Lam chỉ P2 xoay được. Hãy phối hợp xoay cả 2 gương để dẫn tia laser vào Tinh Thể.',
    parMoves: 18,
    isCoop: true,
    grid: [
      '###########',
      '#P........#',
      '#Q.......O#',
      '#.......AB#',
      '###########',
    ],
    blocks: [
      { x: 3, y: 1, kind: 'MIRROR', mirrorAngle: 'SLASH', owner: 'P1' },
      { x: 6, y: 1, kind: 'MIRROR', mirrorAngle: 'SLASH', owner: 'P2' },
      { x: 4, y: 2, kind: 'RUNE', owner: 'P2' },
    ],
    emitters: [
      { x: 3, y: 0, dir: 'DOWN' },
    ],
    crystals: [
      { x: 6, y: 3 },
    ],
    sentinels: [],
    hintSequence: ['RIGHT', 'DOWN', 'RIGHT', 'RIGHT'],
    hintText: 'P1 tới (2,1) xoay Gương Lục Bảo (3,1) sang góc \\. P2 đẩy Đá Lam Tinh vào Ấn Cổ (9,2), rồi quay lại (6,2) xoay Gương Lam Tinh (6,1) chiếu thẳng xuống Tinh Thể (6,3).',
  },
  {
    id: 13,
    code: 'CO-OP 03',
    title: 'Hiệp Lực Phá Vệ Binh',
    subtitle: 'P2 điều khiển Gương Lam Tinh mở đường cho P1 đẩy Đá Lục Bảo.',
    mechanicHint: 'P2 bước qua Rào Chắn Lam để xoay gương tiêu diệt Vệ Binh, trong khi P1 vượt Rào Chắn Lục đẩy đá vào Ấn Cổ.',
    parMoves: 18,
    isCoop: true,
    grid: [
      '###########',
      '#P..1....O#',
      '#Q.2......#',
      '#.......AB#',
      '###########',
    ],
    blocks: [
      { x: 3, y: 2, kind: 'MIRROR', mirrorAngle: 'SLASH', owner: 'P2' },
      { x: 5, y: 1, kind: 'RUNE', owner: 'P1' },
    ],
    emitters: [
      { x: 3, y: 0, dir: 'DOWN' },
    ],
    crystals: [],
    sentinels: [
      { x: 7, y: 2, archetype: 'PATROL_GOLEM', dir: 'LEFT' },
    ],
    hintSequence: ['RIGHT', 'RIGHT', 'RIGHT'],
    hintText: 'P2 bước vào Rào Chắn Lam (2,2) rồi nhấn [Space] xoay Gương Lam (3,2) tiêu diệt Vệ Binh. P1 đi qua Rào Chắn Lục (4,1) đẩy Đá Lục Bảo tới Ấn Cổ (9,1).',
  },
  {
    id: 14,
    code: 'CO-OP 04',
    title: 'Băng Đài Song Hành',
    subtitle: 'Hai đường trượt băng nguyên tố song song đòi hỏi nhịp độ chuẩn xác.',
    mechanicHint: 'Mỗi Pháp Sư trượt khối đá nguyên tố của mình qua hành lang băng để mở khóa Cổng Đôi.',
    parMoves: 14,
    isCoop: true,
    grid: [
      '###########',
      '#P.1.IIIIO#',
      '#Q.2.IIIIO#',
      '#.......AB#',
      '###########',
    ],
    blocks: [
      { x: 2, y: 1, kind: 'RUNE', owner: 'P1' },
      { x: 2, y: 2, kind: 'RUNE', owner: 'P2' },
    ],
    emitters: [],
    crystals: [],
    sentinels: [],
    hintSequence: ['RIGHT', 'RIGHT', 'RIGHT', 'RIGHT'],
    hintText: 'Cả P1 và P2 đẩy khối đá nguyên tố của mình qua Rào Chắn lên mặt băng để trượt thẳng vào 2 ô Ấn Cổ, sau đó trượt theo để bước xuống Cổng A (8,3) và B (9,3).',
  },
  {
    id: 15,
    code: 'CO-OP 05',
    title: 'Thánh Điện Hợp Nhất',
    subtitle: 'Đỉnh cao phối hợp: Gương Lục Bảo, Đá Băng Lam Tinh và Vệ Binh Đền Cổ.',
    mechanicHint: 'P1 xoay Gương Lục Bảo kích hoạt Tinh Thể; P2 đẩy Đá Lam Tinh trượt băng nghiền nát Vệ Binh và đè lên Ấn Cổ.',
    parMoves: 18,
    isCoop: true,
    grid: [
      '############',
      '#P..1......#',
      '#Q..2.IIIO.#',
      '#........AB#',
      '############',
    ],
    blocks: [
      { x: 3, y: 1, kind: 'MIRROR', mirrorAngle: 'SLASH', owner: 'P1' },
      { x: 5, y: 2, kind: 'RUNE', owner: 'P2' },
    ],
    emitters: [
      { x: 3, y: 0, dir: 'DOWN' },
    ],
    crystals: [
      { x: 10, y: 1 },
    ],
    sentinels: [
      { x: 8, y: 2, archetype: 'PATROL_GOLEM', dir: 'LEFT' },
    ],
    hintSequence: ['RIGHT', 'RIGHT', 'RIGHT'],
    hintText: 'P1 sang (2,1) xoay Gương Lục Bảo (3,1) nạp năng lượng cho Tinh Thể (10,1). P2 đi qua Rào Chắn Lam (4,2) đẩy Đá Lam Tinh trượt băng hạ Vệ Binh và vào Ấn Cổ (9,2).',
  },
];
