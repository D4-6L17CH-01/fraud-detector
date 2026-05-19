import * as React from "react"

// 768px es el breakpoint por defecto de 'md' en Tailwind
const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Si se ejecuta en el servidor (SSR), no hacemos nada.
    // Aunque en tu caso con Tauri, siempre estarás en el cliente.
    if (typeof window === "undefined") return

    // Creamos el listener para el tamaño de la pantalla
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Escuchamos los cambios (cuando el usuario redimensiona la ventana)
    mql.addEventListener("change", onChange)
    
    // Forzamos el estado inicial
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    
    // Limpieza pura y dura para que React no llore con fugas de memoria
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Devuelve false por defecto mientras averigua el tamaño real
  return !!isMobile
}