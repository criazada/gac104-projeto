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
#define RFP(F, R, Rev) ((RubiksFacePart) { F, R, Rev })
static void relevantFacesParts(RubiksRotation r, RubiksFacePart fps[4]) {
  if (0) {
  } else if (r == kU) {
    fps[0] = RFP(kF, kU, 0);
    fps[1] = RFP(kL, kU, 0);
    fps[2] = RFP(kB, kU, 0);
    fps[3] = RFP(kR, kU, 0);
  } else if (r == kD) {
    fps[0] = RFP(kF, kD, 0);
    fps[1] = RFP(kR, kD, 0);
    fps[2] = RFP(kB, kD, 0);
    fps[3] = RFP(kL, kD, 0);
  } else if (r == kR) {
    fps[0] = RFP(kF, kR, 0);
    fps[1] = RFP(kU, kR, 0);
    fps[2] = RFP(kB, kL, 1);
    fps[3] = RFP(kD, kR, 1);
  } else if (r == kL) {
    fps[0] = RFP(kF, kL, 0);
    fps[1] = RFP(kD, kL, 0);
    fps[2] = RFP(kB, kR, 1);
    fps[3] = RFP(kU, kL, 1);
  } else if (r == kF) {
    fps[0] = RFP(kU, kD, 1);
    fps[1] = RFP(kR, kL, 0);
    fps[2] = RFP(kD, kU, 1);
    fps[3] = RFP(kL, kR, 0);
  } else if (r == kB) {
    fps[0] = RFP(kU, kU, 0);
    fps[1] = RFP(kL, kL, 1);
    fps[2] = RFP(kD, kD, 0);
    fps[3] = RFP(kR, kR, 1);
  } else if (r == kM) {
    fps[0] = RFP(kF, kM, 0);
    fps[1] = RFP(kD, kM, 0);
    fps[2] = RFP(kB, kM, 1);
    fps[3] = RFP(kU, kM, 1);
  } else if (r == kE) {
    fps[0] = RFP(kF, kE, 0);
    fps[1] = RFP(kR, kE, 0);
    fps[2] = RFP(kB, kE, 0);
    fps[3] = RFP(kL, kE, 0);
  } else if (r == kS) {
    fps[0] = RFP(kU, kE, 1);
    fps[1] = RFP(kR, kM, 0);
    fps[2] = RFP(kD, kE, 1);
    fps[3] = RFP(kL, kM, 0);
  }
}

static void getFacePartOS(RubiksFacePart fp, int *offset, int *stride) {
  int o, s;

  if (0) {
  } else if (fp.part == kU) {
    o = 0;
    s = 1;
  } else if (fp.part == kD) {
    o = 6;
    s = 1;
  } else if (fp.part == kR) {
    o = 2;
    s = 3;
  } else if (fp.part == kL) {
    o = 0;
    s = 3;
  } else if (fp.part == kM) {
    o = 1;
    s = 3;
  } else if (fp.part == kE) {
    o = 3;
    s = 1;
  }

  *offset = o;
  *stride = s;
}

// Retorna uma parte da face do cubo.
//
// Ordem das peças é de cima para baixo e esquerda para direita.
static void getFacePart(RubiksCube *cube, RubiksFacePart fp, RubiksColor colors[3]) {
  int offset;
  int stride;

  getFacePartOS(fp, &offset, &stride);

  for (int i = offset, j = 0; j < 3; i += stride, j++) {
    colors[j] = cube->faces[fp.face].colors[i];
  }
}

static void setFacePart(RubiksCube *cube, RubiksFacePart fp, RubiksColor colors[3]) {
  int offset;
  int stride;
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
    rotateCube(cube, kR, 0);
    rotateCube(cube, kM, 1);
    rotateCube(cube, kL, 1);
  } else if (r == ky) {
    rotateCube(cube, kU, 0);
    rotateCube(cube, kE, 1);
    rotateCube(cube, kD, 1);
  } else if (r == kz) {
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
