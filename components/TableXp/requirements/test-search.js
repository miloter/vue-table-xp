import MiniScanner from './mini-scanner.js';
/**
 * Implementación de una utilidad para realizar búsquedas avanzadas.
 *
 * @author miloter
 * @since 2025-01-04
 * @version 2025-01-06
 * @license MIT
 */
export default class TestSearch {    
    static #T_NOT = 1;
    static #T_AND = 2;
    static #T_OR = 3;
    static #T_PAR_O = 4;
    static #T_PAR_C = 5;
    static #T_GE = 6;
    static #T_LE = 7;
    static #T_GT = 8;
    static #T_LT = 9;
    static #T_EQ = 10;
    static #T_NE = 11;
    static #T_TEST = 12;
    // Soporte para cantidades con signo
    static #T_PLUS = 13;
    static #T_MINUS = 14;


    #searchText; // Texto en el que se busca la coincidencia    
    #stack; // Pila de evaluación
    #scan; // Instancia del analizador léxico
    #token; // El token en curso
    #error; // En caso de error contiene el último error
    
    constructor() {
        this.#searchText = '';
        this.#stack = [];
        this.#error = null;
        this.#scan = new MiniScanner('', true);        
        this.#scan.setOperatorString("'");        
        this.#scan.addOperator(TestSearch.#T_NOT, '!');
        this.#scan.addOperator(TestSearch.#T_AND, '&');
        this.#scan.addOperator(TestSearch.#T_AND, '&&');
        this.#scan.addOperator(TestSearch.#T_OR, '|');
        this.#scan.addOperator(TestSearch.#T_OR, '||');
        this.#scan.addOperator(TestSearch.#T_PAR_O, '(');
        this.#scan.addOperator(TestSearch.#T_PAR_C, ')');    
        this.#scan.addOperator(TestSearch.#T_GE, '>=');    
        this.#scan.addOperator(TestSearch.#T_LE, '<=');    
        this.#scan.addOperator(TestSearch.#T_GT, '>');    
        this.#scan.addOperator(TestSearch.#T_LT, '<');    
        this.#scan.addOperator(TestSearch.#T_EQ, '=');    
        this.#scan.addOperator(TestSearch.#T_EQ, '==');    
        this.#scan.addOperator(TestSearch.#T_NE, '<>');    
        this.#scan.addOperator(TestSearch.#T_NE, '!=');   
        this.#scan.addOperator(TestSearch.#T_PLUS, '+');
        this.#scan.addOperator(TestSearch.#T_MINUS, '-');
        this.#scan.addKeyword(TestSearch.#T_TEST, 'test');
    }

    /**
     * Genera una operación en la pila.
     * @param {*} token 
     */
    #genOpBin(token) {
        let right = this.#stack.pop();
        let left = this.#stack.pop();

        // Si la operación es AND u OR, y algún operando no es booleano
        // se convierten a booleano a partir de su presencia en la cadena
        if ((token === TestSearch.#T_AND || token === TestSearch.#T_OR)) {            
            if(typeof(left) !== 'boolean') {
                left = this.#searchText.indexOf(left) >= 0;
            }
            if(typeof(right) !== 'boolean') {
                right = this.#searchText.indexOf(right) >= 0;
            }
        }

        switch(token) {
            case TestSearch.#T_GE: return this.#stack.push(left >= right);
            case TestSearch.#T_LE: return this.#stack.push(left <= right);
            case TestSearch.#T_GT: return this.#stack.push(left > right);
            case TestSearch.#T_LT: return this.#stack.push(left < right);
            case TestSearch.#T_EQ: return this.#stack.push(left == right);
            case TestSearch.#T_NE: return this.#stack.push(left != right);
            case TestSearch.#T_AND: return this.#stack.push(left && right);            
            case TestSearch.#T_OR: return this.#stack.push(left || right);            
            case TestSearch.#T_TEST: return this.#stack.push(new RegExp(right).test(left));
            default:                
                throw new Error('Operación no implementada, en línea ' +
                    this.#scan.tokenLin() + ', columna ' + this.#scan.tokenCol());
        }
    }

    /**
     * Normaliza una cadena quitando los signos diacríticos y convirtiéndola a minúsculas.
     * @param {string} text Cadena que se normalizará.
     * @returns {string} Cadena normalizada.
     */
    #normalize(text) {
        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }    

    /**
     * Evalua una expresión de búsqueda con un texto de búsqueda y devuelve el
     * resultado como un booleano que si es true indica que la expresión de
     * búsqueda coincide con el texto de búsqueda.
     * @param {string} searchText
     * @param {string} searchExpr
     * @returns {boolean}
     */
    eval(searchText, searchExpr) {           
        this.#error = null;
        this.#stack = [];        
        this.#searchText = this.#normalize(searchText);        
        this.#scan.setText(this.#normalize(searchExpr));
        this.#token = this.#scan.nextToken();
        try {
            this.#expression();
            if (this.#token !== MiniScanner.eof) {
                throw new Error('Inesperado "' + this.#scan.getLexeme() + '", en línea ' +
                    this.#scan.tokenLin() + ', columna ' + this.#scan.tokenCol());
            }
            const value = this.#stack.pop();
            if (typeof(value) === 'boolean') {
                return value;
            } else {
                // Comprueba si está contenido en el texto de búsqueda
                return this.#searchText.indexOf(value) >= 0;
            }
        } catch (error) {
            this.#error = error;
            return false;
        }  
    }

    /**
     * Devuelve el último error o null si no se produjo ninguno.
     */
    get error() {
        return this.#error;
    }

    #isOpRel() {
        return this.#token === TestSearch.#T_GE ||
            this.#token === TestSearch.#T_LE ||
            this.#token === TestSearch.#T_GT ||
            this.#token === TestSearch.#T_LT ||
            this.#token === TestSearch.#T_EQ ||
            this.#token === TestSearch.#T_NE;
    }

    #expression() {
        this.#opOr();            
    }

    #opOr() {
        this.#opAnd();
        this.#restOpOr();
    }

    #restOpOr() {
        while (this.#token === TestSearch.#T_OR) {        
            this.#token = this.#scan.nextToken();                    
            this.#opAnd();
            this.#genOpBin(TestSearch.#T_OR);
        }
    }

    #opAnd() {
        this.#opRel();
        this.#restOpAnd();
    }

    #restOpAnd() {
        while (this.#token === TestSearch.#T_AND) {                        
            this.#token = this.#scan.nextToken();
            this.#opRel();
            this.#genOpBin(TestSearch.#T_AND);
        }
    }    

    #opRel() {
        if (this.#isOpRel()) {
            // Utiliza el texto de búsqueda como operando implícito
            this.#stack.push(this.#searchText);
            this.#restOpRel();
        } else {
            this.#opUn();
        }
    }

    #restOpRel() {
        while (this.#isOpRel()) {
            const token = this.#token;

            this.#token = this.#scan.nextToken();
            this.#opUn();
            this.#genOpBin(token);
        }
    }

    #opUn() {	        		
		if (this.#token === TestSearch.#T_NOT ||
                this.#token === TestSearch.#T_MINUS ||
                this.#token === TestSearch.#T_PLUS) {			
            const token = this.#token;
            
            this.#token = this.#scan.nextToken();		
            this.#opUn();
            const iTop = this.#stack.length - 1;         
            if (token === TestSearch.#T_NOT) {
                if(typeof(this.#stack[iTop]) === 'boolean') {
                    this.#stack[iTop] = !this.#stack[iTop];
                } else { // Se niega la presencia                
                    this.#stack[iTop] = !(this.#searchText.indexOf(this.#stack[iTop]) >= 0);      
                }
            } else if (token === TestSearch.#T_MINUS) {
                this.#stack[iTop] = -this.#stack[iTop];
            } else { // +
                this.#stack[iTop] = +this.#stack[iTop];
            }
        } else {		
		    this.#opPrim();		
        }
    }

    #opPrim() {
        if (this.#token === TestSearch.#T_PAR_O) {            
            this.#token = this.#scan.nextToken();
            this.#expression();
            if (this.#token !== TestSearch.#T_PAR_C) {
                throw new Error('Se esperaba ")", en línea ' +
                    this.#scan.tokenLin() + ', columna ' + this.#scan.tokenCol());
            }
        } else if (this.#token === MiniScanner.string) {
            // Se almacena como una cadena procesada
            this.#stack.push(this.#normalize(this.#scan.getProcessedString()));
        } else if (this.#token === MiniScanner.ident) {
            // Se almacena como una cadena sin procesar
            this.#stack.push(this.#normalize(this.#scan.getLexeme()));
        } else if (this.#token === MiniScanner.number) {
            if (this.#scan.getNumOverflow()) {
                // Se almacena como una cadena
                this.#stack.push(this.#scan.getLexeme());
            } else {
                // Se almacena como un número
                this.#stack.push(this.#scan.getNum());
            }
        } else if (this.#token === MiniScanner.eof && this.#stack.length === 0) {
            // Equivale a comparar con la cadena vacía
            this.#stack.push('');
            return;
        } else if (this.#token === TestSearch.#T_TEST) {            
            // Utiliza el texto de búsqueda como operando implícito
            this.#stack.push(this.#searchText);            
            this.#token = this.#scan.nextToken();
            if (this.#token === MiniScanner.string) {
                // Se almacenan como una cadena sin procesar
                this.#stack.push(this.#normalize(this.#scan.getLexeme().substring(
                    1, this.#scan.tokenLength() - 1)));
                this.#genOpBin(TestSearch.#T_TEST);                       
            } else {
                throw new Error('Se esperaba un literal de cadena, en línea ' +
                    this.#scan.tokenLin() + ', columna ' + this.#scan.tokenCol());
            }                   
        } else {
            throw new Error('Se esperaba una expresión de búsqueda, en línea ' +
                    this.#scan.tokenLin() + ', columna ' + this.#scan.tokenCol());
        }
        this.#token = this.#scan.nextToken();
    }
}
