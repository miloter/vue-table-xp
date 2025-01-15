/**
 * Implementación de una clase cuya función principal es la de
 * servir de analizador léxico o escáner simplificado.
 *
 * Las clases de componentes léxicos que puede reconocer son:
 *      Palabras Clave.
 *      Identificadores.
 *      Constantes numéricas.
 *      Constantes de cadena.
 *      Operadores.
 *      Fin de archivo.
 *      Carácter desconocido.
 * En caso de ambigüedad la prioridad se establece
 * por el orden dado anteriormente de arriba hacia abajo
 *
 * @author miloter
 * @since 2025-01-04
 * @version 2025-01-04
 * @license MIT
 */
export default class MiniScanner {
    // # private static attributes
    /**
     * Expresión regular para evaluar un operador.
     */
    static #reOperator = /^[^\s\p{L}\d]+$/u;

    /**
     * Expresión regular para caracteres alfanuméricos.
     */
    static #reAlphanum = /^[\p{L}\d]$/u;

    /**
     * Expresión regular para caracteres alfabéticos.
     */
    static #reAlpha = /^[_\p{L}]$/u;

    // # private static methods
    /**
     * Devuelve un valor que indica si un carácter se considera un espacio en blanco.
     * @param {*} c 
     * @returns 
     */
    static #isWhiteSpace(c) {
        switch (c) {
            case "\t":
            case "\n":
            case "\v":
            case "\f":
            case "\r":
            case " ":
                return true;
            default:
                return false;
        }
    }

    /**
     * Devuelve un valor que indica si un carácter es un espacio en blanco pero
     * dentro de la misma línea, es decir, no se incluyen los separadores de línea.
     * @param {*} c 
     * @returns 
     */
    static #isWhiteSpaceInLine(c) {
        return MiniScanner.#isWhiteSpace(c) && !MiniScanner.#isLineSeparator(c);
    }

    /**
     * Devuelve un valor que indica si un carácter es un separador de línea.
     * @param {*} c 
     * @returns 
     */
    static #isLineSeparator(c) {
        return c === '\n' || c === '\r';
    }

    /**
     * Devuelve un valor que indica si una cadena se considera un identificador.
     * @param {*} s 
     * @returns 
     */
    static #isIdent(s) {
        if (s.length === 0)
            return false;

        if (!MiniScanner.#reAlpha.test(s[0]))
            return false;

        for (let i = 1; i < s.length; i++) {
            if (!MiniScanner.#reAlphanum.test(s[i])) {
                return false;
            }
        }

        return true;
    }

    // # public static properties
    /**
     * Mayor índice que puede dar el usuario a
     * sus palabras reservadas y operadores
     */
    static get maxUserIndex() { return 4096 };

    /**
     * Indica que el tipo de token es una cadena
     */
    static get string() { return MiniScanner.maxUserIndex + 1; }

    /**
     * Indica que el tipo de token es un carácter no reconocido
     */
    static get uknown() { return MiniScanner.maxUserIndex + 3; }

    /**
     * Indica que el tipo de token es el fin de archivo
     */
    static get eof() { return MiniScanner.maxUserIndex + 5; }

    /**
     * Indica que el tipo de token es un identificador
     */
    static get ident() { return MiniScanner.maxUserIndex + 7; }

    /**
     * Indica que el tipo de token es un número
     */
    static get number() { return MiniScanner.maxUserIndex + 8; }

    /**
     * Indica que el tipo de token es un operador
     */
    static get operator() { return MiniScanner.maxUserIndex + 9; }

    /**
     * Indica que el tipo de token es una palabra clave
     */
    static get keyword() { return MiniScanner.maxUserIndex + 10; }

    /**
     * El número cabe en un entero con signo.
     */
    static get rangeInt() { return 0; }

    /**
     * El número es de doble precisión.
     */
    static get rangeDouble() { return 1; }

    /**
     * El número es demasiado grande y provoca desbordamiento.
     */
    static get rangeOverflow() { return 2; }

    /**
     * Valor absoluto del exponente más grande en un número real
     */
    static get maxExpo() { return Number.MAX_SAFE_INTEGER; }

    /**
     * máximo exponente de un número normalizado positivo o negativo antes de desbordamiento
     */
    static get maxExpoNorm() { return 309; }

    /**
     * mínimo exponente de un número normalizado positivo o negativo antes de cero
     */
    static get minExpoNorm() { return -323; }

    /**
     * Mantisa más grande que puede tener un número:
     *      9007199254740991: 64 bits y 16 dígitos
     */
    static get maxMantissa() { return Number.MAX_SAFE_INTEGER; }

    // # public static methods
    /**
     * Verifica que un operador tenga todos sus componentes comprendidos en los
     * de la lista de operadores permitidos todos están basados en la lista de
     * símbolos no alfanuméricos del código ASCII.
     * @param {*} opr 
     * @returns 
     */
    static #isOperator(opr) {
        return MiniScanner.#reOperator.test(opr);
    }

    // # private attributes
    #text; // El texto que se analizará
    #ignoreCase; // Si se ignoran las diferencias entre mayúsculas y minúsculas            
    #processedString; // Cadena neta: sin delimitadores y secuencias de escape procesadas
    #keywords; // Mapa de palabras reservadas
    #operators; // Mapa de operadores
    #usePoint; // Indica si se usa el separador decimal punto o la coma en los números
    #operatorString; // El operador de cadenas
    #maxLenOperator; // Si se ha procesado un operador, longitud máxima hasta el momento    
    #numRange; // Contendrá un valor entero que indica el rango del número             
    #num; // Último número leido    
    #mant; // Mántisa del último número leido    
    #digits; // Contendrá el número actual de dígitos de la mantisa decimal.    
    #exp1; // El exponente final de la mantisa para decimal y binario            
    #exp2; // El exponente explícito para números reales    
    #numOverflow; // Indica si ha ocurrido un desbordamiento
    #states; // Pila de análisis.   
    #bufferUbound; // Índice del último carácter del buffer    
    #tokenIndex; // Posición del carácter inicial del último token leido    
    #indexBuffer; // Posición del búffer de lectura
    #lin; // Línea actual (base 1)
    #col; // Columna actual (base 1)
    #lastCol; // Ultima columna de la línea anterior
    #token; // El token actual
    #tokenPrev; // El token anterior
    #tokenClass; // La clase token actual

    /**
     * Constructor de la clase.
     * @param string text Texto que será analizado.
     * @param bool ignoreCase Si es verdadero las palabras clave no distingirán mayúsculas de minúsculas.
     * y si es falso será la coma (,).
     */
    constructor(text = '', ignoreCase = false) {
        this.#text = text;
        this.#ignoreCase = ignoreCase;
        // Cadena neta: si delimitadores y secuencias de escape procesadas
        this.#processedString = '';
        this.#keywords = new Map(); // Mapa de palabras reservadas
        this.#operators = new Map(); // Mapa de operadores
        this.#usePoint = true; // Por defecto el punto es el separador decimal
        this.#operatorString = ''; // El operador de cadenas        
        // Si se ha procesado un operador, longitud máxima hasta el momento
        this.#maxLenOperator = 0;
        // Contendrá un valor entero que indica el rango del número         
        this.#numRange = MiniScanner.rangeInt;
        // Último número leido
        this.#num = 0;
        // Mántisa del último número leido
        this.#mant = 0;
        // Contendrá el número actual de dígitos de la mantisa decimal.
        this.#digits = 1;
        // El exponente final de la mantisa para decimal y binario        
        this.#exp1 = 0;
        // El exponente explícito para números reales
        this.#exp2 = 0;
        // Indica si ha ocurrido un desbordamiento
        this.#numOverflow = false;
        // Inicia las variables de análisis
        this.resetVarsAnalisis();
    }

    // # private methods    
    /**
     * Lee un número hexadecimal con un autómata finito determinista:
     * Estado 0 -> 1: 0
     * Estado 1 -> 2: "x"|"X"
     * Estado 2 -> 3: ("0".."9")|("A".."F")|("a".."f"). [Si]
     * Estado 3 -> 3:               ''
     * @returns 
     */
    #readNumHex() {
        const fin = 4;

        let c;
        let estado = 0;
        let lngParcial = 0;
        let lngAceptada = 0;
        let pBuf = this.#indexBuffer; // Utilizará pBuf para apuntar al buffer

        this.#num = 0.0;
        this.#mant = 0;
        this.#exp1 = 0;
        this.#numOverflow = false;

        do {
            if (pBuf <= this.#bufferUbound) {
                c = this.#text[pBuf++];
                lngParcial++;
            } else {
                estado = fin; // Fin de la cadena de entrada
            }

            switch (estado) {
                case 0:
                    if (c === '0') {
                        estado = 1;
                    } else {
                        estado = fin;
                    }
                    break;
                case 1:
                    if ((c === 'X') || (c === 'x')) {
                        estado = 2;
                    } else {
                        estado = fin;
                    }
                    break;
                case 2:
                case 3:
                    if ((c >= '0') && (c <= '9')) {
                        estado = 3;
                        lngAceptada = lngParcial;
                        if (!this.#numOverflow) this.#calculateInt(c.charCodeAt(0) - 48, 16);

                    }
                    else if ((c >= 'A') && (c <= 'F')) {
                        estado = 3;
                        lngAceptada = lngParcial;
                        if (!this.#numOverflow) this.#calculateInt(c.charCodeAt(0) - 55, 16);
                    } else if ((c >= 'a') && (c <= 'f')) {
                        estado = 3;
                        lngAceptada = lngParcial;
                        if (!this.#numOverflow) this.#calculateInt(c.charCodeAt(0) - 87, 16);
                    } else {
                        estado = fin;
                    }
                    break;
            }
        } while (estado !== fin);

        if (lngAceptada > 0) { // Se devuelve lo aceptado
            this.#tokenIndex = this.#indexBuffer;
            this.#indexBuffer += lngAceptada;
            this.#col += lngAceptada;
            return true;
        } else {
            return false;
        }
    }

    /**
     * Lee un número entero o real a partir de la posición actual y devuelve
     * true en caso de que lo haga o false en caso contrario.
     * @returns 
     */
    #readNum() {
        let result = 0;
        let entero = [];

        if (this.#readNumHex()) {
            if (this.#numOverflow) {
                this.#numRange = MiniScanner.rangeOverflow;
            } else {
                this.#numRange = MiniScanner.rangeInt;
            }
            result = true;
        }
        else if (this.#readNumReal(entero)) {
            if (this.#numOverflow) {
                this.#numRange = MiniScanner.rangeOverflow;
            } else if (entero[0]) {
                this.#numRange = MiniScanner.rangeInt;
            } else {
                this.#numRange = MiniScanner.rangeDouble;
            }
            result = true;
        }
        else
            result = false;

        return result;
    }

    /**
     * Esta  función devuelve una constante numérica real, dada la
     * compejidad de un número general, se implementa en un autómata
     * finito determinista con la siguiente tabla de transiciones:
     * Estado 0 -> 1: (0-9)[Sí]
     * Estado 1 -> 1: (0-9)[Sí], 2: (.), 4: (E|e)
     * Estado 2 -> 3: (0-9)[Sí]
     * Estado 3 -> 3: (0-9)[Sí], 4: (E|e)
     * Estado 4 -> 5: (+|-), 6: (0-9)[Sí]
     * Estado 5 -> 6: (0-9[Sí]
     * Estado 6 -> 6: (0-9)[Sí]
     * Estado 7: Fin
     * @param {*} entero 
     * @returns 
     */
    #readNumReal(entero) {
        let c;
        let fin = 7;
        let estado = 0;
        let lngParcial = 0;
        let lngAceptada = 0;
        let pBuf = this.#indexBuffer; // Utilizará pBuf para apuntar al buffer
        let sigNeg = false; // Indica si el exponente tiene signo menos

        entero[0] = true; // Lo cambian el estado 2 y el 4
        this.#num = 0.0;
        this.#mant = 0;
        this.#exp1 = 0;
        this.#exp2 = 0;
        this.#digits = 0; // Número de dígitos de la mantisa

        if (pBuf <= this.#bufferUbound) {
            c = this.#text[pBuf];
            if (c < '0' || c > '9') {
                return false;
            }
        } else {
            return false;
        }

        do {
            if (pBuf <= this.#bufferUbound) {
                c = this.#text[pBuf++];
                lngParcial++;
            } else {
                estado = fin; // Fin de la cadena de entrada
            }

            switch (estado) {
                case 0:
                    if ((c >= '0') && (c <= '9')) {
                        estado = 1;
                        lngAceptada = lngParcial;
                        this.#calculateRealIntPart(c.charCodeAt(0) - 48, entero);
                    } else {
                        estado = fin;
                    }
                    break;
                case 1:
                    if ((c >= '0') && (c <= '9')) {
                        lngAceptada = lngParcial;
                        this.#calculateRealIntPart(c.charCodeAt(0) - 48, entero);
                    } else if (c === (this.#usePoint ? '.' : ',')) {
                        estado = 2;
                    } else if ((c === 'E') || (c === 'e')) {
                        estado = 4;
                        entero[0] = false;
                    } else {
                        estado = fin;
                    }
                    break;
                case 2:
                    if ((c >= '0') && (c <= '9')) {
                        estado = 3;
                        entero[0] = false;
                        lngAceptada = lngParcial;
                        this.#calculateRealDecimalPart(c.charCodeAt(0) - 48);
                    } else {
                        estado = fin;
                    }
                    break;
                case 3:
                    if ((c >= '0') && (c <= '9')) {
                        lngAceptada = lngParcial;
                        this.#calculateRealDecimalPart(c.charCodeAt(0) - 48);
                    } else if ((c === 'E') || (c === 'e')) {
                        estado = 4;
                    } else {
                        estado = fin;
                    }
                    break;
                case 4:
                    if ((c >= '0') && (c <= '9')) {
                        estado = 6;
                        entero[0] = false;
                        lngAceptada = lngParcial;
                        this.#calculateRealExpPart(c.charCodeAt(0) - 48, sigNeg);
                    }
                    else if (c === '+') {
                        estado = 5;
                    } else if (c === '-') {
                        estado = 5;
                        sigNeg = true;
                    } else {
                        estado = fin;
                    }
                    break;
                case 5:
                    if ((c >= '0') && (c <= '9')) {
                        estado = 6;
                        lngAceptada = lngParcial;
                        this.#calculateRealExpPart(c.charCodeAt(0) - 48, sigNeg);
                    }
                    else {
                        estado = fin;
                    }
                    break;
                case 6:
                    if ((c >= '0') && (c <= '9')) {
                        lngAceptada = lngParcial;
                        this.#calculateRealExpPart(c.charCodeAt(0) - 48, sigNeg);
                    } else {
                        estado = fin;
                    }
                    break;
            }
        } while (estado !== fin);

        if (lngAceptada > 0) {
            // Se devuelve lo aceptado
            this.#calculateReal(entero[0], sigNeg);
            this.#tokenIndex = this.#indexBuffer;
            this.#indexBuffer += lngAceptada;
            this.#col += lngAceptada;
            return true;
        } else {
            return false;
        }
    }

    // Termina de calcular un número real
    #calculateReal(entero, sigNeg) {
        this.#numOverflow = false;

        if (entero || this.#mant === 0) {
            this.#num = this.#mant;
            return;
        }

        if (sigNeg) {
            this.#exp1 -= this.#exp2;
        } else {
            this.#exp1 += this.#exp2;
        }

        // mant * 10 ^ exp1 = 0.dd..dd * 10 ^ (exp1 + digits)
        if ((this.#exp1 + this.#digits) > MiniScanner.maxExpoNorm) {
            this.#numOverflow = true;
            this.#num = Infinity; // Infinito positivo
        } else if ((this.#exp1 + this.#digits) < MiniScanner.minExpoNorm) {
            this.#num = 0.0;
        } else {
            this.#num = this.#mant * Math.pow(10.0, this.#exp1);
        }
    }

    #calculateInt(digito, b) {
        if (this.#mant <= Math.floor((MiniScanner.maxMantissa - digito) / b)) {
            this.#mant = this.#mant * b + digito;
            this.#num = this.#mant;
        } else {
            this.#numOverflow = true;
        }
    }

    #calculateRealIntPart(digito, entero) {
        if (this.#mant <= Math.floor((MiniScanner.maxMantissa - digito) / 10)) {
            this.#mant = this.#mant * 10 + digito;

            // Si ya hay dígitos significativos reconocidos
            if (this.#digits !== 0) {
                this.#digits++;
            } else { // ningún dígito significativo se reconoció
                if (digito !== 0) { // sólo si es distinto de cero
                    this.#digits++;
                }
            }
        } else { // ignora el carácter, ya que provocaría desbordamiento
            this.#exp1++;
            entero[0] = false; // ahora deja de ser un número entero
        }
    }

    #calculateRealDecimalPart(digito) {
        if (this.#mant <= Math.floor((MiniScanner.maxMantissa - digito) / 10)) {
            this.#mant = this.#mant * 10 + digito;
            this.#exp1--;

            // si ya hay dígitos significativos reconocidos
            if (this.#digits !== 0) {
                this.#digits++;
            } else { // ningún dígito significativo se reconoció
                // sólo si es distinto de cero
                if (digito !== 0) {
                    this.#digits++;
                }
            }
        }
        // se ignoran los resultados que provoquen desbordamiento
    }

    #calculateRealExpPart(digito, sigNeg) {
        // se ignoran los resultados que provoquen desbordamiento
        if (this.#exp2 <= Math.floor((MiniScanner.maxExpo - digito) / 10)) {
            this.#exp2 = this.#exp2 * 10 + digito;
        }
    }

    /**
     * Se avanza al máximo en la entrada antes de comenzar la lectura de tokens.
     */
    #advanceEntry() {
        while (this.#indexBuffer <= this.#bufferUbound) {            
            if (this.#isBlank(this.#indexBuffer)) {
                this.#indexBuffer++;
                this.#col++;
            } else if (this.#isEol()) {
                this.#advanceLine();            
            }
            else { // El carácter debe tratarse
                break;
            }            
        }
    }    

    /**
     * Devuelve True si se consigue leer un identificador.
     * @returns 
     */
    #readIdentifier() {
        if (this.#isEof())
            return false;

        if (!MiniScanner.#reAlpha.test(this.#curr()))
            return false;

        this.#tokenIndex = this.#indexBuffer++; // Salva el puntero del buffer

        while (this.#indexBuffer <= this.#bufferUbound) {
            if (MiniScanner.#reAlphanum.test(this.#curr()))
                this.#indexBuffer++;
            else
                break;
        }

        this.#col += this.tokenLength(); // Actualiza la columna

        return true;
    };

    /**
     * Devuelve true si lee una cadena entre 2 operadores de cadena.
     * @returns 
     */
    #readString() {
        if (!this.#hasOperator(this.#operatorString))
            return false;

        this.#processedString = '';
        this.#tokenIndex = this.#indexBuffer; // Apunta al principio del buffer

        let salir = false;
        let result = false;

        this.#indexBuffer += this.#operatorString.length; // Lee el primer delimitador
        do {
            if (this.#inEol()) {
                salir = true;            
            } else if (this.#matchString(this.#operatorString)) {
                this.#indexBuffer += this.#operatorString.length; // Lo lee
                salir = true;
                result = true;
            } else if (this.#curr() === '\\') {
                const valor = this.#escapeChar();
                if (valor !== -1) {
                    this.#processedString += valor;
                } else {
                    salir = true;
                }
            } else {
                this.#processedString += this.#currentNext();
            }
        } while (!salir);

        if (result) {
            this.#col += this.tokenLength(); // La columna
        } else {
            this.#indexBuffer = this.#tokenIndex; // Recupera el buffer
        }

        return result;
    }

    /**
     * El puntero de lectura apunta a '\' y se intenta leer una secuencia
     * de escape que se convierte al carácter equivalente, o -1, si no es
     * una secuencia válida.
     * @returns 
     */
    #escapeChar() {        
        let c, code;

        this.#indexBuffer++;

        if (this.#inEol()) {
            return -1;
        }

        switch (this.#curr()) {
            case 'a':
                this.#indexBuffer++;
                return '\x07';
            case 'b':
                this.#indexBuffer++;
                return '\b';
            case 'f':
                this.#indexBuffer++;
                return '\f';
            case 'n':
                this.#indexBuffer++;
                return '\n';
            case 'r':
                this.#indexBuffer++;
                return '\r';
            case 't':
                this.#indexBuffer++;
                return '\t';
            case 'v':
                this.#indexBuffer++;
                return '\v';
            case '0':
                this.#indexBuffer++;
                return '\0';
            case '"':
                this.#indexBuffer++;
                return '"';
            case "'":
                this.#indexBuffer++;
                return "'";
            case '\\':
                this.#indexBuffer++;
                return '\\';
            case 'x': // carácter codificado en hexadecimal
                this.#indexBuffer++;

                // chequea condiciones y lee
                // si procede el primer carácter
                if (this.#isEof()) {
                    return -1;
                }

                c = this.#currentNext();
                if (c >= '0' && c <= '9')
                    code = c.charCodeAt(0) - 48;
                else if (c >= 'A' && c <= 'F')
                    code = c.charCodeAt(0) - 55;
                else if (c >= 'a' && c <= 'f')
                    code = c.charCodeAt(0) - 87;
                else {
                    return -1;
                }

                // chequea condiciones y lee si procede el segundo carácter
                if (this.#isEof()) {                    
                    return -1;
                }
                c = this.#currentNext();
                if (c >= '0' && c <= '9')
                    code = 16 * code + c.charCodeAt(0) - 48;
                else if (c >= 'A' && c <= 'F')
                    code = 16 * code + c.charCodeAt(0) - 55;
                else if (c >= 'a' && c <= 'f')
                    code = 16 * code + c.charCodeAt(0) - 87;
                else {
                    this.#indexBuffer--;
                    return String.fromCharCode(code);
                }

                // chequea condiciones y lee si procede el tercer carácter
                if (this.#isEof()) {                    
                    return -1;
                }
                c = this.#currentNext();
                if (c >= '0' && c <= '9')
                    code = 16 * code + c.charCodeAt(0) - 48;
                else if (c >= 'A' && c <= 'F')
                    code = 16 * code + c.charCodeAt(0) - 55;
                else if (c >= 'a' && c <= 'f')
                    code = 16 * code + c.charCodeAt(0) - 87;
                else {
                    this.#indexBuffer--;
                    return String.fromCharCode(code);
                }

                // chequea condiciones y lee si procede el cuarto carácter
                if (this.#isEof()) {                    
                    return -1;
                }
                c = this.#currentNext();
                if (c >= '0' && c <= '9')
                    code = 16 * code + c.charCodeAt(0) - 48;
                else if (c >= 'A' && c <= 'F')
                    code = 16 * code + c.charCodeAt(0) - 55;
                else if (c >= 'a' && c <= 'f')
                    code = 16 * code + c.charCodeAt(0) - 87;
                else {
                    this.#indexBuffer--;
                    return String.fromCharCode(code);
                }

                return String.fromCharCode(code);
            case 'u': // carácter codificado en hexadecimal
                this.#indexBuffer++;

                // chequea condiciones y lee
                // si procede el primer carácter
                if (this.#isEof()) {
                    return -1;
                }

                c = this.#currentNext();
                if (c >= '0' && c <= '9')
                    code = c.charCodeAt(0) - 48;
                else if (c >= 'A' && c <= 'F')
                    code = c.charCodeAt(0) - 55;
                else if (c >= 'a' && c <= 'f')
                    code = c.charCodeAt(0) - 87;
                else {
                    return -1;
                }

                // chequea condiciones y lee si procede el segundo carácter
                if (this.#isEof()) {                    
                    return -1;
                }
                c = this.#currentNext();
                if (c >= '0' && c <= '9')
                    code = 16 * code + c.charCodeAt(0) - 48;
                else if (c >= 'A' && c <= 'F')
                    code = 16 * code + c.charCodeAt(0) - 55;
                else if (c >= 'a' && c <= 'f')
                    code = 16 * code + c.charCodeAt(0) - 87;
                else {
                    return -1;
                }

                // chequea condiciones y lee si procede el tercer carácter
                if (this.#isEof()) {                    
                    return -1;
                }
                c = this.#currentNext();
                if (c >= '0' && c <= '9')
                    code = 16 * code + c.charCodeAt(0) - 48;
                else if (c >= 'A' && c <= 'F')
                    code = 16 * code + c.charCodeAt(0) - 55;
                else if (c >= 'a' && c <= 'f')
                    code = 16 * code + c.charCodeAt(0) - 87;
                else {
                    return -1;
                }

                // chequea condiciones y lee si procede el cuarto carácter
                if (this.#isEof()) {                    
                    return -1;
                }
                c = this.#currentNext();
                if (c >= '0' && c <= '9')
                    code = 16 * code + c.charCodeAt(0) - 48;
                else if (c >= 'A' && c <= 'F')
                    code = 16 * code + c.charCodeAt(0) - 55;
                else if (c >= 'a' && c <= 'f')
                    code = 16 * code + c.charCodeAt(0) - 87;
                else {
                    return -1;
                }
                
                return String.fromCharCode(code);
            default:
                return this.#currentNext();
        }
    }

    /**
     * Devuelve true si el puntero de análisis está al final de la entrada.
     * @returns 
     */
    #isEof() {
        return this.#indexBuffer > this.#bufferUbound;
    }
    /**
     * Devuelve true si el carácter actual corresponde a un código de fin de línea.
     * @returns 
     */
    #isEol() {
        if (this.#isEof())
            return false;
        else if (MiniScanner.#isLineSeparator(this.#curr()))
            return true;
        else
            return false;
    }

    /**
     * Devuelve true si a continuación viene un final de línea
     * bien se llegó al final de la entrada.
     * @returns 
     */
    #inEol() {
        if (this.#isEof())
            return true;
        else if (this.#isEol())
            return true;
        else
            return false;
    }

    /**
     * Avanza a la siguiente línea. Supone que el carácter actual
     * es un separador de líneas.
     */
    #advanceLine() {
        this.#lastCol = this.#col; // Ultima columna de esta línea

        // Comprueba el caso de sistemas Windows '\r\n'
        if (this.#curr() === '\r') {
            this.#indexBuffer++;

            if (this.#indexBuffer <= this.#bufferUbound) {
                if (this.#curr() === '\n') {
                    this.#indexBuffer++;
                }
            }
        } else { // carácter terminador de línea
            this.#indexBuffer++;
        }

        this.#lin++;
        this.#col = 0;
    }

    /**
     * Devuelve true si se puede hacer coincidir carácter a carácter la cadena
     * pasada como argumento, con el contenido siguiente del buffer de lectura
     * pero no avanza el puntero del buffer.
     * @param {*} s 
     * @returns 
     */
    #matchString(s) {
        if (s === '') {
            return false;
        }

        let i = this.#indexBuffer;
        let j = 0;

        while (i <= this.#bufferUbound && j < s.length) {
            if (this.#text[i] !== s[j]) {
                break;
            }
            i++;
            j++;
        }

        return (j === s.length);
    }

    #addNewOpr(opr, token) {
        if (opr.length > this.#maxLenOperator)
            this.#maxLenOperator = opr.length;

        this.#operators.set(opr, token);
    }
    
    /**
     * Devuelve True si se puede leer un operador de la entrada, si hay éxito
     * 'opr[0]' es el operador en la lista de operadores. Se puede elegir
     * entre avanzar la lectura o continuar en la posición de entrada.
     * @param {*} opr 
     * @param {*} advanceReader 
     * @returns 
     */
    #readOperator(opr, advanceReader) {
        if (this.#isEof())
            return false;

        // Leemos la cadena con longitud menor o igual que el operador más largo
        opr[0] = this.#text.substring(this.#indexBuffer, this.#indexBuffer +
            this.#maxLenOperator);

        while (this.#operators.get(opr[0]) === undefined && opr[0].length > 0) {
            opr[0] = opr[0].substring(0, opr[0].length - 1);
        }

        if (advanceReader && opr[0].length > 0) {
            this.#tokenIndex = this.#indexBuffer;
            this.#indexBuffer += opr[0].length;
            this.#col += opr[0].length;
        }

        return opr[0].length > 0;
    }

    /**
     * Devuelve true si el argumento se puede considerar un operador.
     * @param {*} opr 
     * @returns 
     */
    #hasOperator(opr) {
        let opr2 = [];

        if (this.#isEof())
            return false;

        if (opr.length === 0)
            return false;

        if (!this.#readOperator(opr2, false))
            return false;

        if (opr !== opr2[0])
            return false;

        return true;
    }

    /**
     * Devuelve el carácter actual.
     */
    #curr() {
        return this.#text[this.#indexBuffer];
    }

    /**
     * Devuelve el carácter actual y avanza el puntero del búffer.
     */
    #currentNext() {
        const c = this.#curr();
        this.#indexBuffer++;
        return c;
    }

    /**
     * Devuelve true si el carácter apuntado por el argumento es un blanco:
     * espacio, tabulador horizontal, tabulador vertical, o avance de forma.
     * @param {*} pBuf 
     * @returns 
     */
    #isBlank(pBuf) {
        if ((pBuf < 0) || (pBuf > this.#bufferUbound)) {
            return false;
        }

        return MiniScanner.#isWhiteSpaceInLine(this.#text[pBuf]);
    }

    // # public methods
    /**
     * Reinicia las variables de análisis.
     */
    resetVarsAnalisis() {
        this.#states = []; // Borra la pila de análisis.
        this.beginAnalisis();
        this.#bufferUbound = this.#text.length - 1;
    }

    /**
     * Pone el analizador en un estado de comienzo, sin que se cambie la pila de estados.
     */
    beginAnalisis() {
        // Posición del carácter inicial del último token leido
        this.#tokenIndex = 0;
        // Inicia a cero la posición del búffer de lectura
        this.#indexBuffer = 0;
        this.#lin = 1; // Línea actual (base 1)
        this.#col = 1; // Columna actual (base 1)
        this.#lastCol = this.#col; // Ultima columna de la línea anterior
        this.#token = MiniScanner.eof;
        this.#tokenPrev = MiniScanner.eof;
        this.#tokenClass = MiniScanner.eof;
    }

    /**
     * Indica si el separador decimal de los números es el
     * el punto (.) true, o la coma (,) false.
     * @returns 
     */
    isUsePoint() {
        return this.#usePoint;
    }

    /**
     * Establece si el separador decimal de los números es el
     * el punto (.) true, o la coma (,) false.
     * @param {*} value 
     */
    setUsePoint(value) {
        this.#usePoint = value;
    }

    getIndexBuffer() {
        return this.#indexBuffer;
    }

    getLin() {
        return this.#lin;
    }

    getCol() {
        return this.#col;
    }

    getLastCol() {
        return this.#lastCol;
    }

    /**
     * Devuelve la longitud total de esta secuencia de lectura en número de caracteres.
     * @returns 
     */
    length() {
        return this.#bufferUbound + 1;
    }

    /**
     * Devuelve la longitud del último token leído.
     * @returns 
     */
    tokenLength() {
        return (this.#indexBuffer - this.#tokenIndex);
    }

    /**
     * Devuelve la cadena que corresponde al último token leído.
     * Esto incluye los delimitadores y secuencias de escape sin
     * procesar, en el caso de que existan.
     * @returns 
     */
    getLexeme() {
        return this.#text.substring(this.#tokenIndex, this.#indexBuffer);
    }    

    getText() {
        return this.#text;
    }

    /**
     * Establece el texto de la entrada.
     * @param {string} text Texto de la entrada.
     */
    setText(text) {
        this.#text = text;
        this.resetVarsAnalisis();
    }

    /**
     * Devuelve una subcadena del buffer de entrada.
     * @param {number} start Posición de inicio.
     * @param {number} end Posición final (no incluida).
     * @returns {string}
     */
    substring(start, end) {
        return this.#text.substring(start, end);
    }

    /**
     * Devuelve el último número leído.
     * @returns float|int
     */
    getNum() {
        return this.#num;
    }

    /**
     * Devuelve un valor que indica si el último número leído causó desbordamiento.
     * @returns bool
     */
    getNumOverflow() {
        return this.#numOverflow;
    }

    /**
     * Devuelve el rango de un número. Este valor es una de las constantes de clase:
     *
     * rangeInt: el número es un entero.
     *
     * rangeDouble: El número es de doble precisión.
     *
     * rangeOverflow: El número es demasiado grande y provoca desbordamiento.
     *
     * @returns {number}
     */
    getNumRange() {
        return this.#numRange;
    }

    /**
     * Devuelve la mantisa del último número leído.
     * @returns int
     */
    getMant() {
        return this.#mant;
    }

    /**
     * Si el último token leido es una cadena, contiene la cadena que
     * representa sin los delimitadores y con los caracteres de escape
     * transformados al carácter que representan.
     * @returns 
     */
    getProcessedString() {
        return this.#processedString;
    }

    /**
     * Devuelve el carácter ubicado en una posición del buffer de entrada.
     * @param {*} index Índice a la posición que ocupa el carácter.
     * @returns 
     */
    getChar(index) {
        if (index < 0 || index > this.#bufferUbound) {
            throw new RangeError('El índice debe estár entre cero y la longitud de la secuencia menos uno.');
        }

        return this.#text[index];
    }

    /**
     * Devuelve la clase a la que pertenece el último token leído.
     * @returns
     */
    getTokenClass() {
        return this.#tokenClass;
    }

    /**
     * Devuelve el token actual.
     * @returns {number}
     */
    getToken() {
        return this.#token;
    }

    /**
     * Devuelve el token previamente leído en la cadena de entrada.
     * @returns {number}
     */
    getTokenPrev() {
        return this.#tokenPrev;
    }    

    /**
     * Devuelve la línea donde se encuentra ubicado el último token leído.
     * @returns 
     */
    tokenLin() {
        if (this.#token === MiniScanner.eol)
            return this.#lin - 1;
        else
            return this.#lin;
    }

    /**
     * Devuelve la posición del primer carácter del último token leído.
     * @returns 
     */
    getTokenIndex() {
        return this.#tokenIndex;
    }

    /**
     * Devuelve la columna donde comienza el último token leido.
     * @returns 
     */
    tokenCol() {
        if (this.#token === MiniScanner.eol)
            return this.#lastCol;
        else
            return this.#col - this.tokenLength();
    }

    /**
     * Establece el operador de cadenas.
     * @param {string} value 
     */
    setOperatorString(value) {
        if (value.length === 0) {
            this.#operatorString = '';
        } else if (!MiniScanner.#isOperator(value))
            throw new TypeError(`'${value}' no se admite como operador`);
        else if (this.#operators.get(value) !== undefined)
            throw new Error(`'${value}' ya existe como operador`)
        else { // Se acepta el operador
            this.#operatorString = value;
            this.#addNewOpr(this.#operatorString, MiniScanner.string);
        }
    }

    /**
     * Devuelve el operador de cadenas.
     * @returns {string}
     */
    getOperatorString() {
        return this.#operatorString;
    }

    /**
     * Añade una nueva palabra reservada al analizador.
     * @param {number} token 
     * @param {string} kw 
     */
    addKeyword(token, kw) {
        if (token > MiniScanner.maxUserIndex) {
            throw new RangeError(`${token} debe ser menor o igual a ${MiniScanner.maxUserIndex}`);
        }

        if (this.#ignoreCase) {
            kw = kw.toLowerCase();
        }

        if (!MiniScanner.#isIdent(kw)) {
            throw new TypeError(`${kw} no es una palabra clave válida`);
        } else if (this.#keywords.get(kw) !== undefined) {
            throw new Error(`'${kw}' ya existe como palabra clave`)
        } else { // Se inserta la palabra clave
            this.#keywords.set(kw, token);
        }
    }

    /**
     * Añade una nuevo operador al analizador.
     * Diferentes operadores pueden tener el mismo índice.
     * @param {number} token 
     * @param {string} opr 
     */
    addOperator(token, opr) {
        if (token > MiniScanner.maxUserIndex) {
            throw new RangeError(`${token} debe ser menor o igual a ${MiniScanner.maxUserIndex}`);
        }

        if (!MiniScanner.#isOperator(opr)) {
            throw new TypeError(`'${opr}' no se admite como operador`);                            
        } else if (this.#operators.get(opr) !== undefined) {
            throw new Error(`'${opr}' ya existe como operador`)
        } else {
            this.#addNewOpr(opr, token);
        }
    }    

    /**
     * Devuelve el siguiente token de la entrada.
     * @returns mixed
     */
    nextToken() {
        let opr = [];

        this.#tokenPrev = this.#token; // Salva el índice del token anterior
        this.#advanceEntry(); // Avanza componentes a ignorar

        // Identificadores y palabras clave
        if (this.#readIdentifier()) {
            if (this.#keywords.get(this.#ignoreCase ?
                this.getLexeme().toLowerCase() : this.getLexeme()) !== undefined) { // Es una palabra clave
                this.#tokenClass = MiniScanner.keyword;
                this.#token = this.#keywords.get(this.#ignoreCase ?
                    this.getLexeme().toLowerCase() : this.getLexeme());
            } else {  // Es un identificador
                this.#tokenClass = MiniScanner.ident;
                this.#token = MiniScanner.ident;
            }
            return this.#token;
        }

        // Constantes numéricas
        if (this.#readNum()) {
            this.#tokenClass = MiniScanner.number;
            this.#token = MiniScanner.number;
            return this.#token;
        }

        // Constantes de cadena
        if (this.#readString()) {
            this.#tokenClass = MiniScanner.string;
            this.#token = MiniScanner.string;
            return this.#token;
        }

        /* Es necesario que antes de los operadores vengan los comentarios
        caracteres, cadenas y continuadores de línea, pues comienzan con un operador */

        // Operadores           
        if (this.#readOperator(opr, true)) { // Se leyó un operador
            this.#tokenClass = MiniScanner.operator;
            this.#token = this.#operators.get(opr[0]);
            return this.#token;
        }        

        // El fin de la entrada
        if (this.#isEof()) {
            this.#tokenIndex = this.#indexBuffer;
            this.#tokenClass = MiniScanner.eof;
            this.#token = MiniScanner.eof;
            return this.#token;
        }

        // Carácter no reconocido
        this.#tokenIndex = this.#indexBuffer;
        this.#indexBuffer++;
        this.#col++;
        this.#tokenClass = MiniScanner.uknown;
        this.#token = MiniScanner.uknown;        
        return this.#token;
    }    

    /**
     * Salva en la pila del analizador el estado actual que está compuesto de
     * las propiedades que se devuelven después de obtener el siguiente token.
     */
    push() {
        this.#states.push({
            indexBuffer: this.#indexBuffer,
            tokenIndex: this.#tokenIndex,
            tokenClass: this.#tokenClass,
            token: this.#token,
            tokenPrev: this.#tokenPrev,
            lin: this.#lin,
            col: this.#col,
            lastCol: this.#lastCol,
            numRange: this.#numRange,
            num: this.#num,
            numOverflow: this.#numOverflow,
            mant: this.#mant
        });
    }

    /**
     * Recupera el último estado guardado en la pila del analizador léxico y
     * Retorna el token que se guardó en el último push.
     * @returns
     */
    pop() {
        const state = this.#states.pop();
        this.#indexBuffer = state.indexBuffer;
        this.#tokenIndex = state.tokenIndex;        
        this.#tokenClass = state.claseToken;
        this.#token = state.token;
        this.#tokenPrev = state.tokenPrev;
        this.#lin = state.lin;
        this.#col = state.col;
        this.#lastCol = state.lastCol;
        this.#numRange = state.numRange;
        this.#num = state.num;
        this.#numOverflow = state.numOverflow;
        this.#mant = state.mant;

        return this.#token;
    }

    /**
     * Elimina la cima de la pila pero sin recuperar el estado del analizador.
     */
    removeTopStack() {
        this.#states.pop();        
    }
}
