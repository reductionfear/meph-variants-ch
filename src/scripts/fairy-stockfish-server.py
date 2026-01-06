#!/usr/bin/env python3
"""
Fairy Stockfish WebSocket Server
Wraps fairy-stockfish.exe and provides a WebSocket interface for the browser extension.

Usage:
    python fairy-stockfish-server.py [path-to-fairy-stockfish.exe]
    
Default path: fairy-stockfish.exe (in current directory)
Default port: 8080
"""

import asyncio
import subprocess
import sys
import os

try:
    import websockets
except ImportError:
    print("ERROR: websockets library not found. Install with: pip install websockets")
    sys.exit(1)

# Path to fairy-stockfish.exe - can be overridden via command line
FAIRY_STOCKFISH_PATH = "fairy-stockfish.exe"

class FairyStockfishServer:
    def __init__(self, engine_path):
        self.engine_path = engine_path
        self.engine = None
        self.clients = set()
        self.current_variant = "chess"
        
    async def start_engine(self):
        """Start the Fairy Stockfish process"""
        print(f"[Server] Starting Fairy Stockfish: {self.engine_path}")
        
        self.engine = await asyncio.create_subprocess_exec(
            self.engine_path,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Start reading engine output
        asyncio.create_task(self.read_engine_output())
        print("[Server] Engine process started!")
        
    async def read_engine_output(self):
        """Read output from engine and broadcast to all clients"""
        while True:
            try:
                line = await self.engine.stdout.readline()
                if not line:
                    break
                    
                output = line.decode('utf-8').strip()
                if output:
                    # Log important messages (skip noisy depth updates without pv)
                    if not output.startswith('info depth') or 'pv' in output:
                        print(f"[Engine] {output[:100]}")
                    
                    # Broadcast to all connected clients
                    await self.broadcast(output)
                    
            except Exception as e:
                print(f"[Server] Error reading engine: {e}")
                break
                
    async def send_to_engine(self, command):
        """Send a command to the engine"""
        if self.engine and self.engine.stdin:
            print(f"[Server] >>> {command}")
            self.engine.stdin.write((command + '\n').encode('utf-8'))
            await self.engine.stdin.drain()
            
    async def broadcast(self, message):
        """Send message to all connected clients"""
        if self.clients:
            await asyncio.gather(
                *[client.send(message) for client in self.clients],
                return_exceptions=True
            )
            
    async def handle_client(self, websocket):
        """Handle a WebSocket client connection"""
        print(f"[Server] Client connected: {websocket.remote_address}")
        self.clients.add(websocket)
        
        try:
            async for message in websocket:
                message = message.strip()
                
                # Handle special extension commands
                if message == "sub":
                    await websocket.send("subscribed")
                    continue
                elif message == "whoareyou":
                    await websocket.send("fairy-stockfish-server")
                    continue
                elif message == "whatengine":
                    await websocket.send("Fairy Stockfish 14+ with variant support")
                    continue
                
                # Track variant changes
                if message.startswith("setoption name UCI_Variant"):
                    variant = message.split("value")[-1].strip()
                    self.current_variant = variant
                    print(f"[Server] Variant set to: {variant}")
                
                # Forward command to engine
                await self.send_to_engine(message)
                
        except websockets.exceptions.ConnectionClosed:
            print(f"[Server] Client disconnected")
        finally:
            self.clients.discard(websocket)
            
    async def run(self, host="localhost", port=8080):
        """Start the WebSocket server"""
        await self.start_engine()
        
        # Initialize engine with UCI
        await asyncio.sleep(0.5)
        await self.send_to_engine("uci")
        
        print(f"[Server] WebSocket server starting on ws://{host}:{port}")
        
        async with websockets.serve(self.handle_client, host, port):
            print(f"[Server] ✅ Ready! Connect your extension to ws://{host}:{port}")
            print(f"[Server] Supported variants: chess, crazyhouse, atomic, kingofthehill, 3check, antichess, horde, racingkings")
            # Keep server running indefinitely
            await asyncio.Event().wait()

async def main():
    global FAIRY_STOCKFISH_PATH
    
    # Get engine path from command line or use default
    if len(sys.argv) > 1:
        FAIRY_STOCKFISH_PATH = sys.argv[1]
    
    # Check if engine exists
    if not os.path.exists(FAIRY_STOCKFISH_PATH):
        print(f"ERROR: Fairy Stockfish not found at: {FAIRY_STOCKFISH_PATH}")
        print("")
        print("Usage: python fairy-stockfish-server.py [path-to-fairy-stockfish.exe]")
        print("")
        print("Download Fairy Stockfish from:")
        print("  https://github.com/fairy-stockfish/Fairy-Stockfish/releases")
        sys.exit(1)
        
    server = FairyStockfishServer(FAIRY_STOCKFISH_PATH)
    await server.run()

if __name__ == "__main__":
    print("=" * 60)
    print("  Fairy Stockfish WebSocket Server for Lichess Variants")
    print("=" * 60)
    asyncio.run(main())
