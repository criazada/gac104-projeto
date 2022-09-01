// Implementação de um cubo mágico virtual

#include "rubiks.h"

static RubiksColor defaultColors[6] = {
  YELLOW, // U
  WHITE,  // D
  RED,    // R
  ORANGE, // L
  BLUE,   // F
  GREEN,  // B
};

void resetCube(RubiksCube *cube) {
  for (int i = 0; i < 6; i++) {
    for (int j = 0; j < 9; j++) {
      cube->faces[i].colors[j] = defaultColors[i];
    }
  }
}

// Encontra as partes relevantes das faces envolvidas em uma rotação.
//
// Por exemplo, uma rotação U envolveria as partes de cima de todas as faces
// exceto as U e D
//
// A ordem de troca das faces também é levada em consideração
static void relevantFacesParts(RubiksRotation r, RubiksFacePart fps[4]) {
  RubiksFacePart movements[][4] = {
    { { kF, kU, 0 }, { kL, kU, 0 }, { kB, kU, 0 }, { kR, kU, 0 } }, // U
    { { kF, kD, 0 }, { kR, kD, 0 }, { kB, kD, 0 }, { kL, kD, 0 } }, // D
    { { kF, kR, 0 }, { kU, kR, 0 }, { kB, kL, 1 }, { kD, kR, 1 } }, // R
    { { kF, kL, 0 }, { kD, kL, 0 }, { kB, kR, 1 }, { kU, kL, 1 } }, // L
    { { kU, kD, 1 }, { kR, kL, 0 }, { kD, kU, 1 }, { kL, kR, 0 } }, // F
    { { kU, kU, 0 }, { kL, kL, 1 }, { kD, kD, 0 }, { kR, kR, 1 } }, // B
    { { kF, kM, 0 }, { kD, kM, 0 }, { kB, kM, 1 }, { kU, kM, 1 } }, // M
    { { kF, kE, 0 }, { kR, kE, 0 }, { kB, kE, 0 }, { kL, kE, 0 } }, // E
    { { kU, kE, 1 }, { kR, kM, 0 }, { kD, kE, 1 }, { kL, kM, 0 } }  // S
  };

  for (int i = 0; i < 4; i++) {
    fps[i] = movements[r][i];
  }
}

static void getFacePartOS(RubiksFacePart fp, int *offset, int *stride) {
  int off_str[][2] = {
    { 0, 1 }, { 6, 1 }, { 2, 3 }, { 0, 3 }, // U, D, R, L
    { 0, 0 }, { 0, 0 },                     // F, B
    { 1, 3 }, { 3, 1 },                     // M, E
    { 0, 0 },                               // S
  };

  *offset = off_str[fp.part][0];
  *stride = off_str[fp.part][1];
}

// Retorna uma parte da face do cubo.
//
// Ordem das peças é de cima para baixo e esquerda para direita.
static void getFacePart(RubiksCube *cube, RubiksFacePart fp, RubiksColor colors[3]) {
  int offset, stride;

  getFacePartOS(fp, &offset, &stride);

  for (int i = offset, j = 0; j < 3; i += stride, j++) {
    colors[j] = cube->faces[fp.face].colors[i];
  }
}

// Cola uma parte de uma face do cubo em outra
static void setFacePart(RubiksCube *cube, RubiksFacePart fp, RubiksColor colors[3]) {
  int offset, stride;
  getFacePartOS(fp, &offset, &stride);

  // Índice inicial de j
  int s_j = 0;
  // Tamanho do passo tomado por j
  int o_j = 1;
  if (fp.reversePaste) {
    s_j = 2;
    o_j = -1;
  }

  for (int i = offset, j = s_j; fp.reversePaste ? j >= 0 : j < 3; i += stride, j += o_j) {
    cube->faces[fp.face].colors[i] = colors[j];
  }
}

// Rotaciona uma face do cubo por si só no sentido horário
static void rotateFace(RubiksCube *cube, RubiksRotation f) {
  // Rotação no sentido horário
  int rotMap[9] = {
    2, 5, 8,
    1, 4, 7,
    0, 3, 6
  };

  RubiksFace newFace;
  for (int i = 0; i < 9; i++) {
    newFace.colors[rotMap[i]] = cube->faces[f].colors[i];
  }

  cube->faces[f] = newFace;
}

// Aplica uma rotação no cubo
void rotateCube(RubiksCube *cube, RubiksRotation r, int reversed) {
  RubiksFacePart fps[4];
  RubiksColor colors[3];
  RubiksColor last[3];

  if (reversed) {
    // Jeito preguiçoso de fazer rotação reversa:
    // Faça a mesma rotação 3x
    for (int i = 0; i < 3; i++) {
      rotateCube(cube, r, 0);
    }
  } else if (r == kx) {
    // x = R M' L'
    rotateCube(cube, kR, 0);
    rotateCube(cube, kM, 1);
    rotateCube(cube, kL, 1);
  } else if (r == ky) {
    // y = U E' D'
    rotateCube(cube, kU, 0);
    rotateCube(cube, kE, 1);
    rotateCube(cube, kD, 1);
  } else if (r == kz) {
    // z = F S B'
    rotateCube(cube, kF, 0);
    rotateCube(cube, kS, 0);
    rotateCube(cube, kB, 1);
  } else {
    relevantFacesParts(r, fps);
    getFacePart(cube, fps[3], last);
    for (int i = 2; i >= 0; i--) {
      getFacePart(cube, fps[i], colors);
      setFacePart(cube, fps[i+1], colors);
    }
    setFacePart(cube, fps[0], last);

    if (r != kM && r != kE && r != kS) {
      rotateFace(cube, r);
    }
  }
}

#define RUBIKS_MAIN
//^^^^^^^^^^^^^^^^^^^ descomente para utilizar a main deste arquivo
//                    (ou passe -D RUBIKS_MAIN na hora de compilar)

#ifdef RUBIKS_MAIN
#include <stdio.h>

const char *terminalColors[6] = {
  "\e[107m",
  "\e[103m",
  "\e[44m",
  "\e[102m",
  "\e[48;5;208m",
  "\e[41m"
};

void printFacePart(RubiksColor colors[3]) {
  for (int i = 0; i < 3; i++) {
    printf("%s\e[30m  \e[0m", terminalColors[colors[i]]);
  }
}

void printCube(RubiksCube *cube) {
  for (int i = 0; i < 9; i += 3) {
    for (int f = 0; f < 6; f++) {
      printFacePart(&cube->faces[f].colors[i]);
      printf("  ");
    }
    printf("\n");
  }
}

void rotateAndPrint(RubiksCube *cube, RubiksRotation r, int reversed) {
  rotateCube(cube, r, reversed);
  printCube(cube);
  printf("\n");
}

void rotateAndPrintSeq(RubiksCube *cube, int n, RubiksRotation r[n]) {
  for (int i = 0; i < n; i++) {
    rotateAndPrint(cube, r[i], 0);
  }
}

#define R(...) ((RubiksRotation[]){ __VA_ARGS__ })

int main() {
  RubiksCube cube;

  resetCube(&cube);
  printCube(&cube);
  rotateAndPrintSeq(&cube, 8, R(kM, kE, kM, kE, kM, kE, kM, kE));

  resetCube(&cube);
  printCube(&cube);
  rotateAndPrintSeq(&cube, 24, R(kL, kL, kD, kD, kR, kR, kU, kU, kL, kL, kD, kD, kR, kR, kU, kU, kL, kL, kD, kD, kR, kR, kU, kU));

  return 0;
}
#endif
