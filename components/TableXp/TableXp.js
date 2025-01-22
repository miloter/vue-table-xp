/**
 * TableXp: Componente Vue para tablas, permite:
 * ordenar, filtro simple y avanzado, selección múltiple
 * contenido extra, personalización del contenido
 * selección de columnas visibles y más.
 * Optimizado para velocidad.
 *
 * @author miloter
 * @since 2024-05-11
 * @version 2025-01-16
 *
 * Ordenación y filtrado: se realiza únicamente en las filas que pertenecen
 * al cuerpo de la tabla, excluyendo la fila de cabecera y las del pie.
 * Ordenación: el primer click ordena ascendentemente, el segundo descendentemente y el
 * tercero restaura el estado original, el ciclo se repite en el mismo orden.
 * Filtrado: no se distingue entre mayúscuas y minúsculas ni los
 * caracteres acentuados o con signos diacríticos. Si marcamos el check de
 * expresiones regulares se habilita dicho sistema de búsqueda.
 *
 * props:
 *      headers: array de objetos con los nombres de las cabeceras y las claves.
 *      El formato será {
 *          title: '...',
 *          key: '...',
 *          showFilter: true|[false],
 *          checked: [true]|false
 *      }, donde title es el título descriptivo de la cabecera, key el nombre de
 *      la clave en el objeto de la fila, showFilter indica si se mostrará o no
 *      un campo de filtrado y checked si la columna aparecerá inicialmente.
 *      El array headers puede ser de carga asíncrona.
 *  
 *      rows: array de objetos con los datos de las filas. Puede ser
 *      de carga asíncrona.
 *
 *      rowsPerPage: Número de filas que se mostrarán en cada página
 *      por defecto serán 10.
 *
 *      rowsSelectPage: Array de número de filas por página, por
 *      defecto es [2, 5, 10, 20, 50].
 *
 *      columnsMultiselect: booleano que indica si se muestra o no
 *      un cuadro de selección de columnas visibles, por defecto es true.
 * 
 *      columnsMultiselectMaxHeight: Un número entero que indica la altura de la vista
 *      de columnas seleccionables, el número indica la cantidad de rem.
 *
 *      csvExport: booleano que indica si se muestra o no un botón
 *      de exportación a archivo CSV, por defecto es true.
 *
 *      controlsPagination: booleano que indica si se muestran o no
 *      los controles de paginación, por defecto es true.
 * 
 *      multiselect: booleano que indica si se muestra o no una casilla de
 *      selección en la primera columna. Si es true, cada vez que cambie el
 *      estado de selección se emitirá el evento selectedChanged(selectedRows).
 * emits:
 *      filterChanged(currentRows): Cuando se produce un cambio en la ordenación o
 *      filtrado de las filas, recibe como argumento las filas filtradas.
 *  
 *      paginatedChanged(paginatedRows): Cuando cambia la página visualizada
 *      el argumento son las filas visibles.
 *
 *      selectedChanged(selectedRows): cuando se produce un cambio en las filas
 *      seleccionadas, el argumento son las filas seleccionadas.
 * 
 *      selectedColumnsChanged(selectedColumns): Se produce cuando cambian las
 *      columnas seleccionadas.
 * 
 *      expandChanged(isOpened, row): Si se implementa el slot #extra, se emitirá
 *      dicho evento con un indicador truthy de expandido y la fila afectada por
 *      la expasión/contracción de la fila.
 */

import TestSearch from "./requirements/test-search.js";

export default {
    props: {
        headers: Array,
        rows: Array,
        rowsPerPage: { type: Number, default: 10 },
        rowsSelectPage: { type: Array, default: () => [2, 5, 10, 20, 50] },
        columnsMultiselect: { type: Boolean, default: true },
        columnsMultiselectMaxHeight: { type: Number, default: 16 },
        csvExport: { type: Boolean, default: true },
        controlsPagination: { type: Boolean, default: true },
        multiselect: { type: Boolean, default: false }
    },
    emits: ['filterChanged', 'paginatedChanged', 'selectedChanged',        
        'selectedColumnsChanged', 'expandChanged'
    ],
    template: /*html*/`
        <div :class="componentUid">
            <div class="top-controls">                
                <div>{{ currentRows.length }} filas de {{ rows.length}}</div>
                <a v-if="csvExport" href="#" @click="downloadCsv" title="Exporta el filtrado actual a un archivo CSV">CSV</a>
                <div v-if="columnsMultiselect"
                    class="columns-multiselect" :class="instanceUid"
                    @keyup.esc="columnsSelectDisplayed = false">                        
                    <button type="button" @click="columnsSelectDisplayed = !columnsSelectDisplayed">
                        Mostrar/ocultar columnas
                    </button>                            
                    <div v-show="columnsSelectDisplayed" class="columns-multiselect-checkboxes">
                        <label class="columns-multiselect-label-main">
                            <input type="checkbox"
                                :checked="filteredSelectedColumns.length === headers.length"
                                @click="selectedColumnsChanged($event.target.checked, null)">
                            - Todas Visibles -
                        </label><br>                
                        <template v-for="col in headers" :key="col.key">
                            <label>
                                <input type="checkbox" :checked="col.checked"
                                    @click="selectedColumnsChanged($event.target.checked, col)">
                                {{ col.title }}
                            </label><br>
                        </template>
                    </div>
                </div>
                <slot name="customControls"></slot>
            </div>
            <table class="table">
                <thead>
                    <tr>
                        <th v-if="multiselect">
                            <input type="checkbox" :checked="selectedRowsEqualsRows" @click="changeChecked($event.target.checked, null)">
                            <button type="button" title="Solo seleccionado"
                                @click="filterSelected = !filterSelected"
                                :class="{ 'filter-selected': filterSelected }">
                                &#x2611;
                            </button>
                        </th>  
                        <th v-if="$slots.extra">&nbsp;</th>                            
                        <th v-for="(h, idx) of filteredSelectedColumns" :key="idx">                
                            <div v-if="h.showFilter" class="filter-controls">
                                <span :title="sortTitle" class="sort" @click="sortOrFilter(true, h.key)">&udarr;</span>
                                <input type="text" class="input-filter"
                                    :title="filterTitle" v-model.trim="hFilter[idx].text"
                                    @keyup="sortOrFilter(false, h.key)">                                
                            </div>                                          
                            {{ h.title }}
                        </th>                        
                    </tr>
                </thead>
                <tbody>
                    <template v-for="(r, idx) of paginated" :key="idx">
                        <tr>
                            <td v-if="multiselect">
                                <input type="checkbox" :checked="r[symRowChecked]" @click="changeChecked($event.target.checked, r)">
                            </td>
                            <td v-if="$slots.extra">
                                <a href="#" @click.prevent="expandChanged(r)" style="text-decoration: none;">
                                    {{ r[symRowExpand] ? '∨': '>' }}                                    
                                </a>
                            </td>
                            <template v-for="h of filteredSelectedColumns" :key="h.key">                            
                                <td v-if="$slots[h.key]">                                
                                    <slot :name="h.key" :row="r"></slot>
                                </td>
                                <td v-else>
                                    {{ r[h.key] }}
                                </td>
                            </template>
                        </tr>
                        <tr v-if="$slots.extra && r[symRowExpand]">
                            <td :colspan="(multiselect ? 2 : 1) + headers.length">
                                <slot name="extra" :row="r"></slot>
                            </td>
                        </tr>
                    </template>
                </tbody>            
            </table>
            <div v-show="controlsPagination"
                class="paginator-controls">
                <button type="button" @click="prevPage">&#9664;</button>
                Página <input type="number" :min="1" :max="numPages"
                        v-model="currentPage"
                        @keyup.enter="currentPageEnter">  de {{ numPages }}
                <button type="button" @click="nextPage">&#9654;</button>  
                <label>
                    Filas/Página
                    <select v-model="currentRowsPerPage" @change="setNumPages">
                        <option v-for="rp in rowsSelectPage" :key="rp" :value="rp">{{ rp }}</option>
                    </select>
                </label>        
            </div>            
        </div>
    `,
    data() {
        return {
            hFilter: [],
            currentRows: [],
            unorderedRows: [],
            asc: undefined,
            currentPage: 1,
            numPages: undefined,
            paginated: [],
            // Prop derivada mutable
            currentRowsPerPage: this.rowsPerPage,            
            selectedRows: [],            
            columnsSelectDisplayed: false,
            filterSelected: false,
            // Símbolos del componente
            symRowExpand: Symbol('Indica si la fila extra está expandida'),            
            symRowChecked: Symbol('Indica si la fila está seleccionada')           
        }
    },
    methods: {
        /**
         * Las columnas que tienen el atributo checked a true o las que no
         * lo tienen se muestran inicialmente visibles
         */
        updateHeadersChecked() {
            for (const col of this.headers) {
                if (!('checked' in col)) {
                    col.checked = true;
                }
            }
            this.updateHeaderFilters();
            this.$emit('selectedColumnsChanged', this.filteredSelectedColumns);
        },
        selectedColumnsChanged(value, col) {
            if (col) {
                col.checked = value;
            } else {
                for (const col of this.headers) {
                    col.checked = value;
                }
            }
            this.updateHeaderFilters();
            this.$emit('selectedColumnsChanged', this.filteredSelectedColumns);
        },
        clickOutside(e) {
            if (!this.columnsSelectDisplayed) return;

            // Se comprueba que no exista en ningún elemento contenedor
            // la clase:
            // const className = 'columns-multiselect';
            let el = e.target;
            let exists = false;
            while (el !== null) {
                if (el.classList.contains(this.instanceUid)) {
                    exists = true;
                    break;
                }
                el = el.parentElement;
            }

            if (!exists) {
                this.columnsSelectDisplayed = false;
            }
        },
        expandChanged(row) {
            row[this.symRowExpand] = !row[this.symRowExpand];
            this.$emit('expandChanged', row[this.symRowExpand], row);
        },
        changeChecked(value, row) {
            if (row) {
                row[this.symRowChecked] = value;
                if (value) {
                    this.selectedRows.push(row);
                } else {
                    this.selectedRows = this.selectedRows.filter(r => r !== row);
                }
            } else {
                for (const row of this.currentRows) {
                    row[this.symRowChecked] = value;
                }
                this.selectedRows = value ? this.currentRows : [];
            }
            this.$emit('selectedChanged', this.selectedRows);
        },
        sortOrFilter(isSort = false, key = undefined) {
            if (isSort) {
                if (this.asc !== false) {
                    // Comprobamos si debemos hacer una copia
                    if (this.asc === undefined) {
                        this.unorderedRows = [...this.currentRows];
                        this.currentRows.sort(this.comparer(key));
                    }
                    this.asc = !this.asc;
                    if (!this.asc) {
                        this.currentRows.reverse();
                    }
                } else {
                    this.currentRows = this.unorderedRows;
                    this.unorderedRows = [];
                    this.asc = undefined;
                }
            } else {
                this.asc = undefined;
                this.unorderedRows = [];

                // Comprueba solo los filtros con contenido
                const filterKeys = [];
                for (const f of this.hFilter) {
                    if (!f.text) continue;
                    const filter = this.normalize(f.text);
                    filterKeys.push({
                        filter,
                        key: f.key
                    });
                }

                // Agrega solo las filas que pasen los filtros de texto
                if (filterKeys.length) {
                    this.currentRows = [];
                    for (const row of this.rows) {
                        let add = true;
                        for (let i = 0; i < filterKeys.length; i++) {
                            const match = this.testSearch.eval(String(row[filterKeys[i].key]), filterKeys[i].filter);                            
                            if (!match) {
                                add = false;
                                break;
                            }
                        }

                        if (this.filterSelected) {
                            add = row[this.symRowChecked];
                        }

                        if (add) {
                            this.currentRows.push(row);
                        }
                    }
                } else {
                    if (this.filterSelected) {
                        this.currentRows = this.selectedRows;
                    } else {
                        this.currentRows = this.rows;
                    }
                }
            }

            this.setNumPages();
            this.$emit('filterChanged', this.currentRows);
        },
        /**
         * El comparador, usa una expresión regular para verificar si el valor de
         * la celda es una fecha, en cuyo caso se usa un comparador personalizado.
         * @param {string} key Clave del campo de ordenación.
         * @returns
         */
        comparer(key) {
            const self = this;

            return function (a, b) {
                const valA = a[key], valB = b[key];

                if (self.isDateString(valA) && self.isDateString(valB)) {
                    return self.compareDate(valA, valB);
                }

                if (self.isNumeric(valA) && self.isNumeric(valB)) {
                    return Math.sign(valA - valB);
                } else {
                    return valA.localeCompare(valB);
                }
            }
        },
        isDateString(date) {
            return /^\d{2}(?:\/|-)\d{2}(?:\/|-)\d{4}$/.test(date);
        },
        isNumeric(expr) {
            if (typeof (expr) === 'number' || typeof (expr) === 'bigint') {
                return true;
            } else if (typeof (expr) === 'string') {
                return /^\s*[+-]?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?\s*$/.test(expr);
            } else {
                return false;
            }
        },
        /**
         * Compara dos fechas en formato dd/mm/aaaa o dd-mm-aaaa.    
         * @param {string} valA Fecha en formato dd/mm/aaaa o dd-mm-aaaa.
         * @param {string} valB Fecha en formato dd/mm/aaaa o dd-mm-aaaa.
         * @returns
         */
        compareDate(valA, valB) {
            const dateA = new Date(valA.replace(this.reGroupedDateString, "$2/$1/$3"));
            const dateB = new Date(valB.replace(this.reGroupedDateString, "$2/$1/$3"));

            return dateA > dateB ? 1 : -1;
        },
        /**
         * Normaliza una cadena quitando los signos diacríticos y convirtiéndola a minúsculas.
         * @param {string} text Cadena que se normalizará.
         * @returns {string} Cadena normalizada.
         */
        normalize(text) {
            return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        },
        setNumPages() {
            this.numPages = Math.ceil(this.currentRows.length / this.currentRowsPerPage);
            this.currentPage = 1;
            this.showCurrentPage();
        },
        prevPage() {
            if (this.currentPage === 1) return;
            this.currentPage--;
            this.showCurrentPage();
        },
        nextPage() {
            if (this.currentPage === this.numPages) return;
            this.currentPage++;
            this.showCurrentPage();
        },
        currentPageEnter() {
            if (this.currentPage < 1 || this.currentPage > this.numPages) return;
            this.showCurrentPage();
        },
        // Muestra la página actual
        showCurrentPage() {
            // Calculamos el paginado
            const start = (this.currentPage - 1) * this.currentRowsPerPage;
            this.paginated = this.currentRows.slice(start, start + this.currentRowsPerPage);
            this.$emit('paginatedChanged', this.paginated);
        },
        downloadCsv() {
            this.downloadFileCSV('datos.csv', this.getRowsToCsv());
        },
        // Descarga un fichero simulando un click
        downloadFileCSV(filename, content) {
            /* Se le agrega el BOM U+FEFF que indica
            condificación UTF-16 Big-Endian, y es requerido para
            que  Excel lo interprete correctamente */
            content = '\ufeff' + content;

            // Lo inyecta en un Blob
            const blob = new Blob([content], { type: '' });

            // Utiliza la técnica de la descarga al hacer click
            const el = document.createElement('a');
            el.href = URL.createObjectURL(blob);
            el.download = filename;
            document.body.appendChild(el);
            el.click();
            // Se borra el elemento creado
            document.body.removeChild(el);
        },
        // Devuelve la filas en una cadena con formato CSV        
        getRowsToCsv() {
            // Nueva línea estándar en un CSV
            const nl = '\r\n';
            // Caracter de entrecomillado para campos que lo requieran
            const quotes = '"';
            const dblQuotes = quotes + quotes;
            // Carácter separador de campos
            const sep = ';';
            // Generamos la cadena en formato CSV            
            const sb = [];

            // Trabajaremos con las cabeceras
            const hs = this.headers.filter(h => h.checked);

            // Escribe el valor actual en el array
            function writeValue(sb, value) {
                const hasSep = value.includes(sep);
                const hasQuotes = value.includes(quotes);
                const hasLines = value.includes('\r') || value.includes('\n');

                if (hasSep || hasQuotes || hasLines) {
                    sb.push(quotes);
                }
                if (hasQuotes) {
                    value = value.replaceAll(quotes, dblQuotes);
                }
                sb.push(value);
                if (hasSep || hasQuotes || hasLines) {
                    sb.push(quotes);
                }
            }

            // Cabeceras del CSV            
            for (let i = 0; i < hs.length; i++) {
                const value = hs[i].title;                
                
                writeValue(sb, value);                                            
                if (i < (hs.length - 1)) {
                    sb.push(sep);
                }
            }
            if (sb.length) {
                sb.push(nl);
            }

            // Cuerpo del CSV 
            let nRows = 0;           
            for (const row of this.currentRows) {
                for (let i = 0; i < hs.length; i++) {
                    const value = String(row[hs[i].key] ?? '');

                    writeValue(sb, value);                    
                    if (i < (hs.length - 1)) {
                        sb.push(sep);
                    }
                }
                nRows++;
                if (nRows < this.currentRows.length) {
                    sb.push(nl);
                }
            }

            return sb.join('');
        },
        /**
         * Establece los estilos del componente.
         */
        setComponentStyles() {
            // Si los estilos ya están registrados sale                        
            if (document.querySelector(`head > style[${this.componentUid}]`)) return;
            const cssText = /*css*/`                
                .${this.componentUid} .filter-controls {
                    display: flex;
                    justify-content: center;
                    align-items: baseline;
                }
               
                .${this.componentUid} .sort {
                    cursor: pointer;
                    margin-right: 0.5rem;
                }

                .${this.componentUid} .input-filter {
                    display: inline-block; width: 69%;
                }
               
                .${this.componentUid} .table {
                    border-collapse: collapse;    
                    margin: auto;                    
                }

                .${this.componentUid} .table th, .${this.componentUid} .table td {
                    border: 1px solid black;    
                    padding: 0.5rem;    
                }
               
                .${this.componentUid} .table thead th {
                    text-align: center;
                }
               
                .${this.componentUid} .table tr:nth-child(even) {
                    background-color: rgba(192, 192, 192, 0.205);
                } /* Formato de filas pares */
               
               
                /* Color de fondo al pasar sobre una fila */
                .${this.componentUid} .table tr:hover > td:not(tfoot td) {
                    background-color: rgba(154, 228, 241, 0.301);
                }

                .${this.componentUid} .top-controls {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 3rem;
                }
               
                .${this.componentUid} .paginator-controls {
                    margin: 0.25rem;
                    text-align: center;
                    font-family: initial;
                }                                

                .${this.componentUid} .filter-selected {
                    background-color: lightgreen;
                }

                .${this.componentUid} .columns-multiselect {
                    position: relative;
                    margin: 0.16rem;
                }

                .${this.componentUid} .columns-multiselect-checkboxes {
                    position: absolute;
                    z-index: 1;
                    background-color: lightgray;
                    border: 1px solid black;
                    max-height: ${this.columnsMultiselectMaxHeight}rem;
                    overflow: auto;
                }

                .${this.componentUid} .columns-multiselect-label-main {
                    background-color: #fff5cc;"
                }

            `;
            const style = document.createElement('style');
            // Establece un atributo para identificar los estilos
            style.setAttribute(this.componentUid, '');
            style.appendChild(document.createTextNode(cssText));
            document.getElementsByTagName('head')[0].appendChild(style);
        },
        updateHeaderFilters() {
            this.hFilter = [];
            for (const h of this.headers.filter(h => h.checked)) {
                this.hFilter.push({
                    text: '',
                    key: h.key
                });
            }
        },
        change() {
            this.updateHeaderFilters();
            this.currentRows = this.rows;
            this.$emit('filterChanged', this.currentRows);
            this.setNumPages();
            this.sortOrFilter();
        }
    },
    computed: {
        /**
         * Devuelve las columnas seleccionadas.
         * @returns 
         */
        filteredSelectedColumns() {
            return this.headers.filter(h => h.checked);
        },
        /**
         * Devuelve un ID de instancia del componente único.
         */
        instanceUid() {
            return crypto.randomUUID();
        },
        /**
         * Devuelve un nombre de componente único basado en el nombre del
         * componente, todas las instancias compartirán este ID.
         * @returns {string}
         */
        componentUid() {
            // Buscamos el nombre del componente
            let name = null;
            for (const entry of Object.entries(Vue.getCurrentInstance().appContext.components)) {
                if (this.$options === entry[1]) {
                    name = entry[0];
                    break;
                }
            }

            return `vue-${name}-${btoa(name).replace(/[+/=]/g, '')}`;
        },
        selectedRowsEqualsRows() {
            if (this.selectedRows.length < this.currentRows.length) return false;

            // Solo es necesario verificar los de la página actual
            for (const p of this.paginated) {
                let match = false;
                for (const s of this.selectedRows) {
                    if (s === p) {
                        match = true;
                        break;
                    }
                }
                if (!match) {
                    return false;
                }
            }

            return true;
        },
        reDateString() {
            return /^\d{2}(?:\/|-)\d{2}(?:\/|-)\d{4}$/;
        },
        reGroupedDateString() {
            return /^(\d{2})(?:\/|-)(\d{2})(?:\/|-)(\d{4})$/;
        },
        sortTitle() {
            return 'Ordena de forma ascendente o descendente, según el tipo de dato de la columna';
        },
        filterTitle() {
            return 'Permite filtrar por el texto introducido, no se distiguen mayúsculas de minúsculas ni letras acentuadas o no';
        },
        testSearch() {
            return new TestSearch();
        }
    },
    watch: {
        /**
         * Es necesario escuchar para recalcular las filas visibles
         * debido a que las filas podrían cargarse de forma asíncrona.        
         */
        'rows.length'() {
            this.change();
        },
        /**
         * Si las cabeceras cambian dinámicamente, marca
         * como visibles todas las columnas.
         */
        'headers.length'() {
            this.updateHeadersChecked();
        },
        // Si cambia el filtro de selección
        filterSelected() {
            this.sortOrFilter();
        }
    },
    created() {
        // Establece los estilos del componente
        this.setComponentStyles();
        // Actualiza la propiedad de selección de cada columna
        this.updateHeadersChecked();
        // Fuerza la actualización de todos los elementos    
        this.change();
    },
    mounted() {
        document.addEventListener('click', this.clickOutside);        
    },
    unmounted() {
        document.removeEventListener('click', this.clickOutside);
    }
};
