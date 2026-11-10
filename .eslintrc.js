module.exports = {
    root: true,
    extends: '@react-native',
    rules: {
        // Разрешаем побитовые операции в определенных файлах
        'no-bitwise': [
            'error',
            {
                allow: ['^', '>>>', '^=', '|'],
            },
        ],
    },
    overrides: [
        {
            files: ['**/BeefwebWaveformSlider.tsx'],
            rules: {
                'no-bitwise': 'off', // Отключаем для этого файла
            },
        },
    ],
};
