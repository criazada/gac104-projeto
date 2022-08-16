#ifndef __RUBIKS_H__
#define __RUBIKS_H__

typedef enum {
  WHITE,
  YELLOW,
  BLUE,
  GREEN,
  ORANGE,
  RED,
} RubiksColor;

typedef enum {
  kU, kD, kR, kL, kF, kB, kM, kE, kS,
  kx, ky, kz
} RubiksRotation;

typedef struct {
  RubiksColor colors[9];
} RubiksFace;

typedef struct {
  RubiksFace faces[6];
} RubiksCube;

typedef struct {
  RubiksRotation face;
  RubiksRotation part;
  int reversePaste;
} RubiksFacePart;

void resetCube(RubiksCube *cube);
void rotateCube(RubiksCube *cube, RubiksRotation r, int reversed);

#endif
