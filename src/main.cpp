/*
  Stockfish, a UCI chess playing engine derived from Glaurung 2.1
  Copyright (C) 2004-2026 The Stockfish developers (see AUTHORS file)

  Stockfish is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  Stockfish is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

#include <iostream>
#include <memory>

#include "bitboard.h"
#include "misc.h"
#include "position.h"
#include "tune.h"
#include "uci.h"

#ifdef __EMSCRIPTEN__
    #include <emscripten.h>
#endif

#if defined(__EMSCRIPTEN__)
    #define EM_STATIC static
#else
    #define EM_STATIC 
#endif


using namespace Stockfish;


// Execute UCI::loop() only once.
extern "C" void wasm_uci_execute(int argc, char* argv[]) {
    using namespace Stockfish;

    [[maybe_unused]] EM_STATIC auto __init_once = [&]() {
        Bitboards::init();
        Position::init();

        auto uci = std::make_unique<UCIEngine>(argc, argv);

        Tune::init(uci->engine_options());

        uci->loop();

        return 0;
    }();
}

// Argument Count & Argument Vector
int main(int argc, char* argv[]) {
    std::cout << engine_info() << std::endl;

    wasm_uci_execute(argc, argv);

    return 0;
}
