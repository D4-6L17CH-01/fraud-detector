export interface TransaccionIA {
    tipo: string;
    numero: number;
    ano: number;
    mes: number;
    dia: number;
    // Esto le dice a TS: "Habrá muchas otras llaves tipo string que tendrán números o strings"
    [cuentaPUC: string]: number | string;
}