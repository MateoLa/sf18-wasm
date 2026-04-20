<div align="center">

<img src=/assets/Chimpanzee1d4.jpg width="180"></img>

<h3>Bitboards inside a chess program</h3>

</div>


#### Population Count

An operation to determine the cardinality of a bitboard, also called Hamming weight. How many one bits exists in a 64 bits word?

Is used to evaluate the mobility of pieces from their attack sets.

Popcnt instruction in In C++.


* Empty Bitboards <br>
To test a bitboard is empty, one compares it with zero, or use the logical not operator:

```C++
if ( x == 0 ) -> bitboard is empty
if ( !x )     -> bitboard is empty

// The inverse condition (not empty) is of course:
if ( x != 0 ) -> bitboard is not empty
if ( x )      -> bitboard is not empty
```

* Single Populated Bitboards <br>
We can extract the LS1B to look whether it is empty.<br>
Alternatively and faster, we can reset the LS1B to look whether the bitboard becomes empty.

```C++
if ( x != 0 && (x & (x-1)) == 0 ) -> population count is one, power of two value

// One can skip the leading x != 0 condition to test popcount <= 1:
if ( (x & (x-1)) == 0 ) -> population count is less or equal than one

// The inverse relation tests whether a bitboard has more than one bit set:
if ( x & (x-1) ) -> population count is greater than one
```

To get the population count we can use loop approaches. <br>
Brute force adding all 64 bits is too slow.

Brian Kernighan's way: <br>
Consecutively reset LS1B in a loop until the bitset becomes empty.

```C++
int popCount (U64 x) {
   int count = 0;
   while (x) {
       count++;
       x &= x - 1; // reset LS1B
   }
   return count;
}
```

Despite branches - this is still one of the fastest approaches for sparsely populated bitboards. <br>
Of course the more bits that are set, the longer it takes.

Another solutions for population counts are based on divide and conquer techniques.

#### BitScan

A function that determines the bit-index of the least significant 1 bit (LSB)(bitscan forward) or the most significant 1 bit (MSB) (bitscan reverse).

* Trailing Zero Count <br>
Bitscan forward is identical with a Trailing Zero Count for none empty sets.

You could use many methods to get the bitscan like bitscan by modulo, magic bitscan, De Bruijn multiplication, divide and conquer, etc. <br>

* By Popcount <br>
Counting the trailing zeros of LSB after subtracting one:

```C++
// precondition bb != 0
int bitScanForward(U64 bb) {
   assert (bb != 0);
   return popCount( (bb & -bb) - 1 );
}
```


#### Pawn Patterns

* Pawn Pushes

```C++
U64 wSinglePushTargets(U64 wpawns, U64 empty) {
   return nortOne(wpawns) & empty;
}

U64 wDblPushTargets(U64 wpawns, U64 empty) {
   const U64 rank4 = C64(0x00000000FF000000);
   U64 singlePushs = wSinglePushTargets(wpawns, empty);
   return nortOne(singlePushs) & empty & rank4;
}

U64 bSinglePushTargets(U64 bpawns, U64 empty) {
   return soutOne(bpawns) & empty;
}

U64 bDoublePushTargets(U64 bpawns, U64 empty) {
   const U64 rank5 = C64(0x000000FF00000000);
   U64 singlePushs = bSinglePushTargets(bpawns, empty);
   return soutOne(singlePushs) & empty & rank5;
}
```

* Pawns able to Push <br>
Are the intersection of pawns with the shifted empty squares in opposite direction.

```C++
U64 wPawnsAble2Push(U64 wpawns, U64 empty) {
   return soutOne(empty) & wpawns;
}

U64 wPawnsAble2DblPush(U64 wpawns, U64 empty) {
   const U64 rank4 = C64(0x00000000FF000000);
   U64 emptyRank3 = soutOne(empty & rank4) & empty;
   return wPawnsAble2Push(wpawns, emptyRank3);
}
```

Pawn Rams: all pawns that are blocked by the opponent's pawns. <br>
Lever Pawn: opposing pawns in contact that can capture each other. <br>
Immobile Pawns: rammed pawns that are not a lever pawn.

And many more functions are defined: pawn islands, isolated pawns, passed pawns, canidates, etc.


#### Knight Attacks

```sh
        noNoWe    noNoEa
            +15   +17
noWeWe  +6 __|     |__+10 noEaEa
              \   /
                *
           __ /   \ __ 
soWeWe -10   |     |   -6 soEaEa
            -17   -15
        soSoWe    soSoEa
```

```sh
# arrKnightAttacks[d4]
. . . . . . . .
. . . . . . . .
. . 1 . 1 . . .
. 1 . . . 1 . .
. . . * . . . .
. 1 . . . 1 . .
. . 1 . 1 . . .
. . . . . . . .
```

* Knight Attacks Calculation

```C++
U64 noNoEa(U64 b) {return (b << 17) & notAFile ;}
U64 noEaEa(U64 b) {return (b << 10) & notABFile;}
U64 soEaEa(U64 b) {return (b >>  6) & notABFile;}
U64 soSoEa(U64 b) {return (b >> 15) & notAFile ;}
U64 noNoWe(U64 b) {return (b << 15) & notHFile ;}
U64 noWeWe(U64 b) {return (b <<  6) & notGHFile;}
U64 soWeWe(U64 b) {return (b >> 10) & notGHFile;}
U64 soSoWe(U64 b) {return (b >> 17) & notHFile ;}
```

* Knight Attacks

```C++
U64 knightAttacks(U64 knights) {
   U64 l1 = (knights >> 1) & C64(0x7f7f7f7f7f7f7f7f);
   U64 l2 = (knights >> 2) & C64(0x3f3f3f3f3f3f3f3f);
   U64 r1 = (knights << 1) & C64(0xfefefefefefefefe);
   U64 r2 = (knights << 2) & C64(0xfcfcfcfcfcfcfcfc);
   U64 h1 = l1 | r1;
   U64 h2 = l2 | r2;
   return (h1<<16) | (h1>>16) | (h2<<8) | (h2>>8);
}
```


#### King Attacks

```C++
U64 kingAttacks(U64 kingSet) {
   U64 attacks = eastOne(kingSet) | westOne(kingSet);
   kingSet    |= attacks;
   attacks    |= nortOne(kingSet) | soutOne(kingSet);
   return attacks;
}
```

King Safety is an important evaluation topic. Some bitboard pattern are about to recognize king safety related features. To evaluate those features is a complete other story.


#### Sliding Piece Attacks

In chess they are the Rooks, the Bishops and the Queen. Those which can move an unlimited number of empty squares horizontally, vertically o diagonally.

Move targets require intersection from attack-sets with opponent pieces for captures and with all empty squares for quiet moves.


#### Magic Bitboards

Are a multiply-right-shift perfect hashing algorithm to get an attack bitboard database for bishop or rook in one run.


#### References

Chess Programming Wiki [Bitboards](https://www.chessprogramming.org/Bitboards)

