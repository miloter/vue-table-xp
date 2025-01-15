# TableXp: Componente Vue para usar en aplicaciones basadas en ES Module
Este componente permite:
* Ordenar, filtrar y selección múltiple
* Contenido extra, personalización del contenido
* Selección de columnas visibles, exportación del filtrado, etc.
* Optimizado para búsquedas avanzadas.

## Ejemplo
### HTML/index.html
```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tabla de datos con ordenación y filtrado</title>
    <script src="https://unpkg.com/vue@3.4.5/dist/vue.global.js"></script>
</head>

<body>
    <div id="app"></div>
    <script src="app.js" type="module"></script>
    <script type="module">
        import App from './App.js';

        App.mount('#app');
    </script>
</body>
</html>
```

### JS/App.js
```js
import TableXp from "./components/TableXp/TableXp.js";

const App = Vue.createApp({
    components: { TableXp },
    template: /*html*/`        
        <TableXp :headers="headers" :rows="rows" :rowsPerPage="5"
            controlPosition="both" :csvExport="true" :multiselect="true"
            @filterChanged="onFilterChanged"
            @paginatedChanged="onPaginatedChanged"
            @selectedChanged="onSelectedChanged">
            <template #extra="{ row }">
                {{ row }}
            </template>
            <template #['thumbnailUrl']="{ row }">                                            
                <img :src="row.thumbnailUrl" width="150" alt="Miniatura de imagen">                
            </template>            
        </TableXp>    
    `,
    data() {
        return {            
            headers: [{
                title: 'ID',
                key: 'id',
                showFilter: true
            }, {
                title: 'Title',
                key: 'title',
                showFilter: true
            }, {
                title: 'URL',
                key: 'url',
                showFilter: true
            }, {
                title: 'Imagen URL',
                key: 'thumbnailUrl',                                
            }],
            rows: []
        }
    },
    methods: {        
        async fetchRows() {
            const json = await fetch(this.apiUrl).then(resp => resp.json());            
            this.rows = json.map((r, i) => {                
                r.thumbnailUrl = r.thumbnailUrl;
                return r;
            });
        },
        onFilterChanged(currentRows) {
            console.log('nuevo filtrado de ' + currentRows.length + ' filas');
        },
        onPaginatedChanged(paginatedRows) {
            console.log('nueva página de ' + paginatedRows.length + ' filas');
        },
        onSelectedChanged(selectedRows) {
            console.log('nueva selección de ' + selectedRows.length + ' filas');
        }        
    },
    computed: {
        apiUrl() {
            return 'https://jsonplaceholder.typicode.com/photos';
        }
    },
    created() {
        this.fetchRows();        
    }
}); 

export default App;
```
