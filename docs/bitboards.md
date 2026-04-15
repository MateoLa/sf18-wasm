<div align="center">

<img src=/assets/Queens_Star.jpg></img>

<h3>Stockfish</h3>

<p>A free and strong UCI chess engine.</p>
<p>Analyzes chess positions and computes optimal moves.</p>
</div>


#### Bitboards

Each square of the board is represented by one bit in a 64 bits word. The bitboard. 

To represent a game position we typically need one bitboard for each piece-type and color. Thus an array of bitboards is one position object. A one-bit inside a bitboard implies the existence of a piece of this piece-type on a certain square.

Bitboards can also represent things like attack and defend sets, move-targets and so on. We going to see this later.

piece-types = {P, N, B, R, Q, K}

colors = {w, b}

SideToMove = {1, 0}

class Board = {wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK} (12 Bitboards)

Little-Endian Rank-File Mapping: {a1, b1, c1, ..., f8, g8, h8}  -->  generally used in chess and by Stockfish
Little-Endian File-Rank Mapping: {a1, a2, a3, ..., h6, h7, h8}

In C++ one bitboard is represented by an unsigned 64, U64 variable. In Javascript it is an Int64. 

From now on it is very important to notice:

  * square a1 = LSB (least significant bit) <br>
  * square h8 = MSB (most significant bit) <br>
  * In boolean operations the binary are written from left to right (as is also the case with decimals) so the binary representation of the board will be: <br> 
  {h8, g8, f8, ...c1, b1, a1} <br>
  That means that a boolean "<<" left shift operation (bits movement to the left) will represent a chess move to the upper right side of the board. On the other hand, a boolean ">>" right shift operation (bits movement to the right) will represent a ches move to the bottom left side of the board.    


#### Easy Boolean Operations

wPieces = wP || wN || wB || wR || wQ || wK;

occupiedSquares = wPieces || bPieces;

emptySquares = !ocuppiedSquares;

Sliding Pieces (bishops, rooks and queen) can move an indefinite number of squares along an horizontal, vertical or diagonal line until the edge of the board or another piece obstructs the ray of a line.

```sh
# Queen Moves Bitboard:
. . . . . . . .
. . . 1 . . 1 .
. 1 . 1 . 1 . .
. . 1 1 1 . . .
1 1 1 * 1 1 1 .
. . 1 1 1 . . .
. . . 1 . 1 . .
. . . 1 . . . .
```

attackedPieces = QueenMoves & opponentPieces;


#### Shifting Bitboards (Piece Movements)

Neighboring squares can be determined by adding an offset for each direction.

```sh
northwest    north    northeast
noWe                       noEa
        +7    +8     +9
               |
west    -1 <-- * --> +1    east
               |
        -9    -8     -7
soWe                       soEa
southwest    south    southeast

# The numbers represents bits right or bits left
```

For border squares one has to care about overflows or wraps outside of the board.

a-File = 0x0101010101010101 <br>
h-File = 0x8080808080808080

Vertical moves (north or south) doesn't need any special consideration because bits simply fall out and disappear from the BB. <br>
shift-South BB = bb >> 8; (boolean shift right) <br>
shift-North BB = bb << 8; (boolean shift left)

Any move to the right (east, northeast or southeast) cannot overflow the board, that is, fall onto the a-File. <br>
shift-East BB = (bb << 1) & !a-File; <br>
shift-Northeast BB = (bb << 9) & !a-File; <br>
shift-Southeast BB = (bb >> 7) & !a-File;

Any shift to the left (west, northwest or southwest) cannot wrap the board, that is, fall onto the h-File. <br>
shift-West BB = (bb >> 1) & !h-File; <br>
shift-Northwest BB = (bb << 7) & !h-File; <br>
shift-Southwest BB = (bb >> 9) & !h-File; <br>

This represents [One Square Only] movements applying `Post-Shift` masks (file in which the movement cannot fall applied after the shift). <br>
We can calculate the same with `Pre-Shift` mask (files from which the movement can't start).

shift-East BB = (bb & !h-File) << 1; <br>
shift-Northeast BB = (bb & !h-File) << 9; <br>
shift-Southeast BB = (bb & !h-File) >> 7; <br>
shift-West BB = (bb & !a-File) >> 1; <br>
shift-Northwest BB = (bb & !a-File) << 7; <br>
shift-Southwest BB = (bb & !a-File) >> 9; <br>

Applying one shift multiple times may be used to generate attack sets and moves of pieces like knights and siliding pieces.

For instance all white pawns single push targets can be determined with one shift north plus intersection with empty squares.

whiteSinglePawnPushTargets = shiftNorth(wPawns) & emptySquares;


#### Generalized Shift

Shifts left for positive ammounts and right for negative ammounts:

U64 genShift(U64 x, int s) {
    return (s > 0) ? (x << s) : (x >> -s);
}

Where x will be the Bitboard an s the direction.


#### One Step Shift in C++

The directions will be {noEa, east, soEa, south, soWe, west, noWe, north} <br>
In C++ they will be: int shift[8] = {9, 1, -7, -8, -9, -1, 7, 8}

Thus applying the Generalized Shift formula, positive directions will be left shifts and negative directions will be right shifts as we saw erlier in Bitboard Shifts.

We need to take care about wraps outside the board. <br>
For example, a piece movement to the northWeast can't fall over the 1-Rank or the h-File. <br>
To avoid that we need to apply the following mask to a noWe movement:

```sh
# noWe mask = 0x7F7F7F7F7F7F7F00
1 1 1 1 1 1 1 .
1 1 1 1 1 1 1 .
1 1 1 1 1 1 1 . 
1 1 1 1 1 1 1 .
1 1 1 1 1 1 1 .
1 1 1 1 1 1 1 .
1 1 1 1 1 1 1 .
. . . . . . . .
```
It has "0" in the 1-Rank and the h-File.

Each direction has its own mask that will be applied. <br>
In C++ the avoid wraps mask vector is: 

U64 avoidWrap[8] = {
  0xfefefefefefefe00,
  0xfefefefefefefefe,
  0x00fefefefefefefe,
  0x00ffffffffffffff,
  0x007f7f7f7f7f7f7f,
  0x7f7f7f7f7f7f7f7f,
  0x7f7f7f7f7f7f7f00,
  0xffffffffffffff00
}

Finally, the C++ One Step movement formula:

U64 shiftOne (U64 b, int dir8) {
  return _rotl64(b, shift[dir8]) & avoidWrap[dir8];
}

x86-64 rot64 works like a generalized shift with positive or negative shift amount since it internally applies an unsigned modulo 64 and makes -i = 64-i.


#### Square Operations

U64 singleBitset = C64(1) << sq; <br>
Where "sq" is the square index from 0 to 63 <br>
C64(1) is the 64 bits binary "1" or the binary 000...001 (with 63 zeros).

```C++
if (bb & singleBitset)  //  Check if the bit denoted by singleBitset is set.
bb |= singleBitset;  //  Set the bit denoted by singleBitset (boolean or operation).
bb ^= singleBitset;  //  Toggle the bit of square index (boolean xor)
bb &= ~singleBitset;  //  Reset the bit (boolean relative complement)
{ bb |= singleBitset; bb ^= singleBitset; }  // Reset the bit by setting it and toggling.
```

x86 processors provides a bit-test instruction family (bt, bts, btr, btc) 


#### Update By Move

Is a technique to initialize or update the Board by toggling the bits in each square position. <br>
Which particular bitboards has to be updated depends on the moving piece or captured piece. <br>
While making or unmaking moves, the singleBitset to use corresponds with the "from-square" or "to-square" of the move.

move = {piece, color, from, to, promotion};

"from" is index of the board (1..64) representing the from-square; <br>
"to" is the board index (1..64) representing the to-square; 

```sh
# Quiet moves toggle both from-square and to-square.
U64 fromBB = C64(1) << move->from;  
U64 toBB = C64(1) << move->to;
U64 fromToBB = fromBB |+ toBB;
pieceBB[move->piece] ^= fromToBB;  # update piece bitboard
colorBB[move->color] ^= fromToBB;  # update color bitboard
occupiedBB ^= fromToBB;  # updete occupied bitboard
emptyBB ^= fromToBB;  # update empty bitboard
```

```sh
# Captures need to consider the captured piece.
U64 fromBB = C64(1) << move->from;
U64 toBB = C64(1) << move->to;
U64 fromToBB = fromBB |+ toBB;
pieceBB[move->piece] ^= fromToBB;  # update piece bitboard
colorBB[move->color] ^= fromToBB  # update color bitboard
capturedBB[cPiece] ^= toBB;  # reset the captured piece
capturedColorBB[cColor] ^= toBB;  # update captured color bitboard
occupiedBB ^= fromBB;  # updeate occupied, only from becomes empty
emptyBB ^= fromBB;  # update empty.
```

Similar for special moves like castling, promotions and en-passant captures.

#### Upper and Lower bits

U64 upperBits = C64(~1) << sq;
U64 lowerBits = (C64(1) << sq) -1;


#### Swapping Bits

Swapping none overlapping bit-sequences in a bitboard is the base of a lot of permutation tricks.


#### Swapping Bits by Position

Swap n bits between positions i and j

```C++
/**
 * @param b any bitboard
 * @param i,j positions of bit sequences to swap
 * @param n number of consecutive bits to swap
 * @return bitboard b with bits swapped
 */
U64 swapNBits(U64 b, int i, int j, int n) {
  U64 m = (1 << n) - 1;
  U64 x = ((b >> i) ^ (b >> j)) & m;
  return b ^ (x << i) ^ (x << j);
}
```

Example: Swap 6 bits between positions c3 and c6. <br>
(i = 17, j = 41, n = 6)

```sh
bb:                          swaped bb:
* * . . . * * *              * * . . . * * * 
* * . . . * * *              * * . . . * * * 
* a b c d e f *              * A B C D E F * 
* * * * * * * *     =>       * * * * * * * * 
* * * * * * * *              * * * * * * * * 
* A B C D E F *              * a b c d e f *
* * . . . . . *              * * . . . . . * 
* * . . . . . *              * * . . . . . * 
```

```sh
 1<<6                 m = (1<<6) - 1
 . . . . . . . .      . . . . . . . .
 . . . . . . . .      . . . . . . . .
 . . . . . . . .      . . . . . . . .
 . . . . . . . .      . . . . . . . .
 . . . . . . . .      . . . . . . . .
 . . . . . . . .      . . . . . . . .
 . . . . . . . .      . . . . . . . .
 . . . . . . 1 .      1 1 1 1 1 1 . .
                                            xor =
 bb >> i(17)          bb >> j(41)           (bb>>i) ^ (bb>>j)     x = xor & m        with
 . . . . . . . .      . . . . . . . .       . . . . . . . .       . . . . . . . .    
 . . . . . . . .      . . . . . . . .       . . . . . . . .       . . . . . . . .
 * . . . * * * .      . . . . . . . .       * . . . * * * .       . . . . . . . .    r = a ^ A
 * . . . * * * *      . . . . . . . .       * . . . * * * *       . . . . . . . .    s = b ^ B
 a b c d e f * *      . . . . . . . .       a b c d e f * *   =>  . . . . . . . .    t = c ^ C
 * * * * * * * *      * . . . * * * .       . . . . . . . *       . . . . . . . .    u = d ^ D
 * * * * * * * *      * . . . * * * *       . . . . . . . .       . . . . . . . .    v = e ^ E
 A B C D E F * *      a b c d e f * *       r s t u v w . .       r s t u v w . .    w = f ^ F

bb                 x << i || x << j    swapNBits(bb, 17, 41, 6)
* * . . . * * *    . . . . . . . .     . . . . . . . .
* * . . . * * *    . . . . . . . .     * . . . . . . .
* a b c d e f *    . r s t u v w .     * A B C D E F *
* * * * * * * *    . . . . . . . .     . . . . . . . .
* * * * * * * *    . . . . . . . .     . . . . . . . .
* A B C D E F *    . r s t u v w .     . . . . . . . .
* * . . . . . *    . . . . . . . .     * a b c d e f *
* * . . . . . *    . . . . . . . .     . . . . . . . .
```

#### Delta Swap

To swap by Delta you provide a mask for the lower portion of the bits to swap an the delta spaces between portions.

In the example abobe, swap 6 bits between positions c3 and c6, delta is 24 = 41 - 17 and the mask is 0x7E0000

```sh
# mask = 0x7E0000
. . . . . . . .
. . . . . . . .
. . . . . . . .
. . . . . . . .
. . . . . . . .
. 1 1 1 1 1 1 .
. . . . . . . .
. . . . . . . .
```

```C++
/**
 * @param b any bitboard
 * @return bitboard b with bits swapped
 */
U64 deltaSwap(U64 b, U64 mask, int delta) {
   U64 x = (b ^ (b >> delta)) & mask;
   return   x ^ (x << delta)  ^ b;
}
```

In fact, we may apply any arbitrary mask pattern, as long as no overlapping occurs. To No overlapping the intersection of the mask with mask << delta must be empty.<br>
For instance, we can swap odd with even files of a bitboard by calling deltaSwap with delta of one, and mask of 0x5555555555555555:

Applications of delta swaps are flipping, mirroring and rotating boards.


#### References

Chess Programming Wiki [Bitboards](https://www.chessprogramming.org/Bitboards)

