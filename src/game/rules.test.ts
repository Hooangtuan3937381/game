import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStars,
  createLevelState,
  reflectLaser,
  rotateAdjacentMirror,
  stepPlayerMove,
  undoLastMove,
} from './rules';
import { Direction, PlayerRole } from './levels';

function runMoves(levelId: number, actions: (Direction | 'SPACE')[]) {
  const state = createLevelState(levelId);
  for (const act of actions) {
    if (act === 'SPACE') {
      rotateAdjacentMirror(state, 'P1');
    } else {
      stepPlayerMove(state, act, 'P1');
    }
  }
  return state;
}

function runCoopMoves(
  levelId: number,
  actions: { role: PlayerRole; act: Direction | 'SPACE' }[]
) {
  const state = createLevelState(levelId);
  for (const step of actions) {
    if (step.act === 'SPACE') {
      rotateAdjacentMirror(state, step.role);
    } else {
      stepPlayerMove(state, step.act, step.role);
    }
  }
  return state;
}

test('All 10 Solo puzzle stages are 100% solvable from initial spawn state to VICTORY', () => {
  const s1 = runMoves(1, ['RIGHT', 'RIGHT', 'UP', 'RIGHT', 'RIGHT', 'RIGHT', 'DOWN']);
  assert.equal(s1.status, 'VICTORY');

  const s2 = runMoves(2, ['RIGHT', 'RIGHT', 'RIGHT', 'RIGHT', 'DOWN', 'RIGHT']);
  assert.equal(s2.status, 'VICTORY');

  const s3 = runMoves(3, ['DOWN', 'RIGHT', 'RIGHT', 'RIGHT', 'UP', 'RIGHT', 'RIGHT', 'RIGHT']);
  assert.equal(s3.status, 'VICTORY');

  const s4 = runMoves(4, [
    'RIGHT',
    'SPACE',
    'DOWN',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'DOWN',
    'RIGHT',
  ]);
  assert.equal(s4.sentinels[0].alive, false);
  assert.equal(s4.status, 'VICTORY');

  const s5 = runMoves(5, [
    'DOWN',
    'RIGHT',
    'UP',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'SPACE',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'DOWN',
    'DOWN',
  ]);
  assert.equal(s5.status, 'VICTORY');

  const s6 = runMoves(6, [
    'DOWN',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'DOWN',
    'RIGHT',
  ]);
  assert.equal(s6.status, 'VICTORY');

  const s7 = runMoves(7, ['RIGHT', 'RIGHT', 'RIGHT', 'DOWN', 'RIGHT']);
  assert.equal(s7.status, 'VICTORY');

  const s8 = runMoves(8, [
    'SPACE',
    'DOWN',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'DOWN',
    'RIGHT',
    'RIGHT',
    'RIGHT',
  ]);
  assert.equal(s8.sentinels[0].alive, false);
  assert.equal(s8.status, 'VICTORY');

  const s9 = runMoves(9, [
    'RIGHT',
    'DOWN',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'DOWN',
    'RIGHT',
    'RIGHT',
  ]);
  assert.equal(s9.status, 'VICTORY');

  const s10 = runMoves(10, [
    'RIGHT',
    'RIGHT',
    'SPACE',
    'LEFT',
    'DOWN',
    'RIGHT',
    'RIGHT',
    'RIGHT',
    'DOWN',
    'RIGHT',
    'RIGHT',
  ]);
  assert.equal(s10.sentinels[0].alive, false);
  assert.equal(s10.status, 'VICTORY');
});

test('Co-op color ownership rules enforce P1/P2 barriers, blocks, mirrors, and all 5 Co-op stages (11-15) solve to VICTORY', () => {
  // Check color restriction on Stage 11: P1 cannot push P2's block at (2,2)
  const checkPerm = createLevelState(11);
  // Move P2 out of (1,2) so P1 can try stepping down and pushing P2's block
  stepPlayerMove(checkPerm, 'DOWN', 'P2'); // P2 at (1,3)
  stepPlayerMove(checkPerm, 'DOWN', 'P1'); // P1 at (1,2)
  const forbiddenPush = stepPlayerMove(checkPerm, 'RIGHT', 'P1'); // tries to push P2 block at (2,2)
  assert.equal(forbiddenPush, false);

  // Stage 11 (CO-OP 01) full solve
  const s11 = runCoopMoves(11, [
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'DOWN' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P1', act: 'DOWN' },
    { role: 'P1', act: 'DOWN' },
    { role: 'P1', act: 'RIGHT' },
  ]);
  assert.equal(s11.portalOpen, true);
  assert.equal(s11.p1OnExit, true);
  assert.equal(s11.p2OnExit, true);
  assert.equal(s11.status, 'VICTORY');

  // Stage 12 (CO-OP 02) full solve
  const s12 = runCoopMoves(12, [
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'SPACE' }, // rotates P1 mirror at (3,1)
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' }, // pushes P2 block onto plate at (9,2)
    { role: 'P2', act: 'LEFT' },
    { role: 'P2', act: 'LEFT' }, // P2 at (6,2) below P2 mirror at (6,1)
    { role: 'P2', act: 'SPACE' }, // rotates P2 mirror at (6,1) -> powers crystal at (6,3)
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'DOWN' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' }, // P2 on EXIT_P2 (9,3)
    { role: 'P1', act: 'DOWN' }, // (2,2)
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' }, // (8,2)
    { role: 'P1', act: 'DOWN' }, // P1 on EXIT_P1 (8,3)
  ]);
  assert.equal(s12.status, 'VICTORY');

  // Stage 13 (CO-OP 03) full solve
  const s13 = runCoopMoves(13, [
    { role: 'P2', act: 'RIGHT' }, // onto BARRIER_P2 at (2,2)
    { role: 'P2', act: 'SPACE' }, // rotates P2 mirror at (3,2) -> destroys sentinel at (6,2)
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' }, // pushes P1 block onto plate at (9,1)
    { role: 'P2', act: 'DOWN' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' }, // P2 on EXIT_P2 (9,3)
    { role: 'P1', act: 'DOWN' },
    { role: 'P1', act: 'DOWN' }, // P1 on EXIT_P1 (8,3)
  ]);
  assert.equal(s13.sentinels[0].alive, false);
  assert.equal(s13.status, 'VICTORY');

  // Stage 14 (CO-OP 04) full solve
  const s14 = runCoopMoves(14, [
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' }, // P1 block slides on ice to plate (9,1)
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' }, // P2 block slides on ice to plate (9,2)
    { role: 'P2', act: 'RIGHT' }, // P2 slides on ice to (8,2)
    { role: 'P2', act: 'DOWN' },
    { role: 'P2', act: 'RIGHT' }, // P2 on EXIT_P2 (9,3)
    { role: 'P1', act: 'RIGHT' }, // P1 slides on ice to (8,1)
    { role: 'P1', act: 'DOWN' },
    { role: 'P1', act: 'DOWN' }, // P1 on EXIT_P1 (8,3)
  ]);
  assert.equal(s14.status, 'VICTORY');

  // Stage 15 (CO-OP 05) full solve
  const s15 = runCoopMoves(15, [
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'SPACE' }, // rotates P1 mirror at (3,1) -> powers crystal (10,1)
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' }, // pushes P2 block onto ice -> crushes sentinel and hits plate (9,2)
    { role: 'P2', act: 'RIGHT' }, // P2 slides on ice to (8,2)
    { role: 'P2', act: 'DOWN' },
    { role: 'P2', act: 'RIGHT' },
    { role: 'P2', act: 'RIGHT' }, // P2 on EXIT_P2 (10,3)
    { role: 'P1', act: 'DOWN' },
    { role: 'P1', act: 'DOWN' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' },
    { role: 'P1', act: 'RIGHT' }, // P1 on EXIT_P1 (9,3)
  ]);
  assert.equal(s15.sentinels[0].alive, false);
  assert.equal(s15.status, 'VICTORY');
});

test('Laser reflection math, Undo stack, and Star mastery calculations', () => {
  assert.equal(reflectLaser('DOWN', 'BACKSLASH'), 'RIGHT');
  assert.equal(reflectLaser('DOWN', 'SLASH'), 'LEFT');

  const state = createLevelState(1);
  stepPlayerMove(state, 'RIGHT');
  assert.equal(state.moves, 1);

  assert.equal(undoLastMove(state), true);
  assert.equal(state.moves, 0);
  assert.equal(state.playerX, 2);

  assert.equal(calculateStars(8, 9, 3), 3);
  assert.equal(calculateStars(11, 9, 3), 2);
  assert.equal(calculateStars(20, 9, 2), 1);
  assert.equal(calculateStars(10, 9, 0), 0);
});

test('Custom domain normalization, room invite URL builder, and QR matrix generator work accurately', async () => {
  const {
    normalizeCustomDomain,
    buildRoomInviteUrl,
    generateQrMatrix,
  } = await import('../utils/domainShare');

  const validSub = normalizeCustomDomain('game.matbaodemo.vn/');
  assert.equal(validSub.valid, true);
  assert.equal(validSub.normalized, 'https://game.matbaodemo.vn');
  assert.equal(validSub.subdomainHost, 'game');
  assert.equal(validSub.rootDomain, 'matbaodemo.vn');

  const invalid = normalizeCustomDomain('khong co dau cham');
  assert.equal(invalid.valid, false);

  const inviteUrl = buildRoomInviteUrl(
    'http://localhost:3000',
    validSub.normalized,
    'coop12'
  );
  assert.equal(inviteUrl, 'https://game.matbaodemo.vn/?room=COOP12');

  const qr = generateQrMatrix(inviteUrl);
  assert.equal(qr.size > 20, true);
  assert.equal(qr.cells.length, qr.size);
  assert.equal(qr.cells[0].length, qr.size);
});

test('Player login deterministic ID and Co-op room role assignment prevent two players from controlling the same character', async () => {
  const {
    buildDeterministicPlayerId,
    assignRoomRoleForPlayer,
  } = await import('../utils/playerAuth');

  const idA = buildDeterministicPlayerId('Tuan', '1234', 'dev-1');
  const idA_again = buildDeterministicPlayerId('tuan', '1234', 'dev-999');
  assert.equal(idA, idA_again);

  const idB = buildDeterministicPlayerId('Minh', '5678', 'dev-2');
  assert.notEqual(idA, idB);

  // Player A creates/joins room preferring AUTO -> gets P1
  const resA = assignRoomRoleForPlayer([], idA, 'AUTO');
  assert.equal(resA.assignedRole, 'P1');
  assert.equal(resA.isReconnect, false);

  // Player B joins room where Player A already holds P1 -> even if B requests P1 or AUTO, B strictly gets P2
  const resB = assignRoomRoleForPlayer(
    [{ playerId: idA, name: 'Tuan', role: resA.assignedRole }],
    idB,
    'P1'
  );
  assert.equal(resB.assignedRole, 'P2');
  assert.equal(resB.isReconnect, false);

  // If Player A reconnects while Player B is in the room with P2, Player A keeps P1
  const resAReconnect = assignRoomRoleForPlayer(
    [
      { playerId: idA, name: 'Tuan', role: 'P1' },
      { playerId: idB, name: 'Minh', role: 'P2' },
    ],
    idA,
    'AUTO'
  );
  assert.equal(resAReconnect.assignedRole, 'P1');
  assert.equal(resAReconnect.isReconnect, true);
});

