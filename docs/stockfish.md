<div align="center">

[<img src=https://stockfishchess.org/images/logo/icon_128x128.png></img>](https://stockfishchess.org)

<h3>Stockfish</h3>

<p>A free and strong UCI chess engine.</p>
<p>Analyzes chess positions and computes optimal moves.</p>
</div>


#### Bitboards

To represent the board we typically need one bitboard for each piece-type and color. Thus an array of bitboards is one position object.
A one-bit inside a bitboard implies the existence of a piece of this piece-type on a certain square.

Bitboards can also represent things like attack and defend sets, move-targets and so on.

piece-types = {P, N, B, R, Q, K}

colors = {w, b}

class Board = {wP, wN, wB, wR, wQ, wK, bP, bN, bB, bR, bQ, bK}

The bitboard maps all squares on a chessboard from a1 to h8 been a1 = LSB = 2^0 and h8 = MSB = 2^63

Little-Endian Rank-File Mapping: {a1, b1, c1, ..., f8, g8, h8}
Little-Endian File-Rank Mapping: {a1, a2, a3, ..., h6, h7, h8}


