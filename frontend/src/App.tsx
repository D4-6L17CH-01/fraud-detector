import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { Command } from "@tauri-apps/plugin-shell";
import { getCurrentWindow } from '@tauri-apps/api/window';
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [backendStatus, setBackendStatus] = useState('Durmiendo');

  useEffect(() => {
    let iaCommand: Command<any>;

    const arrancarMotor = async () => {
      try {
        setBackendStatus('Despertando a la bestia...');
        iaCommand = Command.sidecar('binaries/motor_ia');

        iaCommand.on('close', data => {
          console.warn('close',data)
          setBackendStatus('Muerto')
        });
        iaCommand.on('error', error => {
          console.warn('error', error)
          setBackendStatus('Error fatal')
        }
      );

        await iaCommand.spawn();
        setBackendStatus('En línea y escuchando en puerto 8000');
      } catch (e) {
        console.error("Fallo al iniciar el sidecar", e);
      }
    };

    arrancarMotor();

    const appWindow = getCurrentWindow();

    const unlistenPromise = appWindow.onCloseRequested(async (event) => {
      event.preventDefault();
      console.log("Secuestrando el cierre, aniquilando backend...");
      setBackendStatus('Asesinando backend...');

      try {
        // 2. Disparamos el endpoint de suicidio (esperamos a que salga la petición)
        await fetch('http://127.0.0.1:8000/suicidio', {
          method: 'POST',
        });
      } catch (e) {
        // Si falla es porque el backend ya estaba muerto, ganamos igual.
      }

      // 3. Ahora sí, le damos permiso a la ventana de destruirse
      await appWindow.destroy();
    })

    // Cleanup del listener de la ventana
    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [])

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <div>
        <h1>Detector de Fraudes 3000</h1>
        <p>Estado del Motor de IA: <strong>{backendStatus}</strong></p>
        <button onClick={async () => {
          // Un simple ping para ver si el servidor de Python está vivo
          try {
            const res = await fetch('http://127.0.0.1:8000/docs');
            if (res.ok) alert("El backend respondió. El milagro es real.");
          } catch (e) {
            alert("Silencio de radio. El backend no está funcionando.");
          }
        }}>
          Hacer Ping al Backend
        </button>
      </div>

      <div className="row">
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>
    </main>
  );
}

export default App;
