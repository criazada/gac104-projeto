## Sobre

Um cubo mágico é composto de 6 faces de 9 peças.
Cada face tem uma cor distinta para suas peças.
Uma face pode ser rotacionada para movimentar peças ao redor do cubo.
Nosso objetivo é implementar um cubo mágico interativo, onde o usuário pode realizar movimentos com o teclado ou mouse.
Almejamos criar um resolvedor do cubo, possivelmente de duas formas: resolvendo de trás para frente já que sabemos todos os movimentos ou algoritmicamente.
O primeiro método é o que cumpriremos inicialmente, o segundo vemos como extra.

## Desenvolvimento

Um cubo mágico abstrato simples cuida das operações básicas a serem realizadas em um cubo mágico: rotações.
Esta parte não possui componentes gráficos; é apenas uma abstração.
Rotações giram uma face do cubo no sentido horário ou anti-horário.
As principais implementadas devem ser: U, D, R, L, F, B, M, E, S, x, y, z, e seus variantes anti-horários.
Essas dão todos os graus de liberdade em um cubo mágico onde cada fatia sua pode ser movimentada uma de cada vez.

A parte gráfica será feita integrando a parte abstrata com uma cena criada com OpenGL.

### Detalhes de Implementação - Cubo Abstrato

Rotações e faces devem ser consistentes, e isso não é algo fácil de conciliar.
A implementação atual tem compromissos.
A ordem das peças de uma face tem sentido da esquerda para a direita e de cima para baixo.
Algumas rotações ficam inconsistentes se todas as faces tem a mesma ordem de peças.
Por exemplo, uma rotação R levaria as peças 2, 5 e 8 da face F para as posições 2, 5 e 8 da face U.
A mesma rotação deve levar as peças 2, 5 e 8 da face U para as peças 6, 3 e 0 da face B.
Como solução, tomamos por determinar uma rotação como uma sequência de cópias de lado de face para o próximo lado de face onde deve ser colado.
Devemos também ficar atentos para quando a colagem deve ser feita de trás para frente, como no caso de U -> B na rotação R.
No final, uma rotação é definida assim: na rotação R o lado direito da face F vai para o lado direito da face U que vai para o lado esquerdo da face B (colado ao contrário) que vai para o lado direito da face D (colado ao contrário).

Uma rotação completa é, então, a rotação em si de uma face e a movimentação de peças de faces adjacentes.

Rotações no sentido anti-horário são implementadas realizando a equivalente no sentido horário 3 vezes.
X' significa rotação X no sentido anti-horário.

Rotações x, y e z são implementadas como composições de outras rotações. São elas para cada um:
- x = R M' L'
- y = U E' D'
- z = F S B
