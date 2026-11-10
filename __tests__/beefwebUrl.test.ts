import { buildBeefwebUrl } from '../src/services/beefwebUrl';

describe('buildBeefwebUrl', () => {
    test('adds HTTP and the configured port to a host', () => {
        expect(buildBeefwebUrl('192.168.1.100', '8880')).toBe(
            'http://192.168.1.100:8880',
        );
    });

    test('does not duplicate a port already present in the URL', () => {
        expect(buildBeefwebUrl('http://192.168.1.100:8880/', '8880')).toBe(
            'http://192.168.1.100:8880',
        );
    });

    test('preserves HTTPS when it is explicitly configured', () => {
        expect(buildBeefwebUrl('https://foobar.example/', '')).toBe(
            'https://foobar.example',
        );
    });

    test('rejects an invalid port', () => {
        expect(() => buildBeefwebUrl('192.168.1.100', '70000')).toThrow(
            'Foobar2000 port must be between 1 and 65535.',
        );
    });
});
