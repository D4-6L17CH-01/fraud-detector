export interface DeteccionRegistro {
    id: number;
    numero_transaccion: number;
    es_fraude: boolean;
    fecha: string;
    payload: string; // Llega como string desde la base de datos
}