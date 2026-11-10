/**
 * Мок для Jest: нативный модуль TCP сокета.
 *
 * Реальные соединения в тестах не открываются; сервисы,
 * требующие сокета, подменяют фабрику через
 * setMpdSocketFactory() из mpdClient.
 */

module.exports = {
    __esModule: true,

    default: {
        connect: jest.fn(),

        createConnection: jest.fn(),
    },
};
