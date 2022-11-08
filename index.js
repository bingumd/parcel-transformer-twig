const glob = require('glob')
const Twig = require('twig')
const { Transformer } = require('@parcel/plugin')

module.exports = new Transformer({
    async loadConfig({ config }) {
        const { contents, filePath } =
            (await config.getConfig(['.twigrc', '.twigrc.js'])) || {}

        if (contents) {
            if (filePath.endsWith('.js')) {
                config.invalidateOnStartup()
            }
            config.invalidateOnFileChange(filePath)
        } else {
            config.invalidateOnFileCreate({
                fileName: '.twigrc' || '.twigrc.js',
                aboveFilePath: config.searchPath,
            })
        }

        return contents
    },

    async transform({ asset, config, logger }) {
        let data = config.data || {}

        asset.type = 'html'

        const options = {
            path: asset.filePath,
            async: false,
            debug: Boolean(config.debug || false),
            trace: Boolean(config.trace || false),
            namespaces: config.namespaces,
        }

        // IMPORTANT: cache false, it rerenders included/embedded files
        config.cache !== true && Twig.cache(false)

        // config special functions, filters or extend
        const { functions, filters, tests, extend, watchFolder } = config

        if (functions) {
            Object.entries(functions).forEach(([name, fn]) =>
                Twig.extendFunction(name, fn)
            )
        }

        if (filters) {
            Object.entries(query.filters).forEach(([name, fn]) =>
                Twig.extendFilter(name, fn)
            )
        }

        if (tests) {
            Object.entries(query.tests).forEach(([name, fn]) =>
                Twig.extendTest(name, fn)
            )
        }

        if (extend) {
            Twig.extend(extend)
        }

        // watch
        if (watchFolder) {
            glob(watchFolder + '/**/*.twig', {}, (err, files) => {
                if (err) return
                files.map(file => asset.invalidateOnFileChange(file))
            })
        }

        // data
        if (typeof data === 'function') {
            data = data()

            if (typeof data !== 'object') {
                throw new Error('data parameter should return an object')
            }

            data?.watchFile && asset.invalidateOnFileChange(data.watchFile)
        }

        // Render template
        const template = Twig.twig(options).render(data)

        asset.setCode(template)

        return [asset]
    },
})
