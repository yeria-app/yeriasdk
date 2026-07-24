import { InvalidParameterError } from '../errors';

export type YeriaLinkFormat = 'https' | 'yeria';

export interface YeriaLinkOptions {
    format?: YeriaLinkFormat;
}

/**
 * Generates canonical links that open a destination in Yeria.
 *
 * HTTPS links are the default because they work on web pages as well as on
 * devices with Yeria installed. The custom `yeria:` scheme is available for
 * environments that already know the application is installed.
 */
export class YeriaLink {
    private static readonly serviceIdPattern = /^[A-Za-z0-9._~-]{1,128}$/;

    static service(serviceId: string, options: YeriaLinkOptions = {}): string {
        return this.base(serviceId, 's', options);
    }

    static component(
        serviceId: string,
        providerPath: string,
        options: YeriaLinkOptions = {}
    ): string {
        const path = this.assertProviderPath(providerPath);
        return `${this.base(serviceId, 'v', options)}?p=${encodeURIComponent(path)}`;
    }

    static chat(serviceId: string, options: YeriaLinkOptions = {}): string {
        return this.base(serviceId, 'c', options);
    }

    static pin(serviceId: string, options: YeriaLinkOptions = {}): string {
        return this.base(serviceId, 'p', options);
    }

    static subscribe(serviceId: string, options: YeriaLinkOptions = {}): string {
        return this.base(serviceId, 'n', options);
    }

    static isValid(link: string): boolean {
        const trimmed = link.trim();
        if (!trimmed ||
            !/^(?:https|yeria):\/\//i.test(trimmed) ||
            /[\u0000-\u001F\u007F\\]/.test(trimmed) ||
            this.hasNonCanonicalRoutePath(trimmed)) {
            return false;
        }

        let url: URL;
        try {
            url = new URL(trimmed);
        } catch {
            return false;
        }

        if (url.hash || url.username || url.password) return false;

        let segments: string[];
        if (url.protocol === 'yeria:') {
            if (url.hostname.toLowerCase() !== 'dl' || url.port) return false;
            segments = url.pathname.split('/').filter(Boolean);
        } else if (url.protocol === 'https:') {
            if (url.hostname.toLowerCase() !== 'yeria.app' || url.port) return false;
            segments = url.pathname.split('/').filter(Boolean);
            if (segments.shift() !== 'dl') return false;
        } else {
            return false;
        }

        if (segments.length !== 2) return false;
        const [operation, serviceId] = segments;
        if (!serviceId || !this.serviceIdPattern.test(serviceId)) return false;

        if (operation === 's') {
            return url.search === '';
        }

        if (operation === 'v') {
            const keys = [...url.searchParams.keys()];
            const paths = url.searchParams.getAll('p');
            const providerPath = paths[0];
            return keys.length === 1 &&
                keys[0] === 'p' &&
                paths.length === 1 &&
                providerPath !== undefined &&
                this.isProviderPath(providerPath);
        }

        return operation !== undefined &&
            ['c', 'p', 'n'].includes(operation) &&
            url.search === '';
    }

    private static hasNonCanonicalRoutePath(link: string): boolean {
        const authorityStart = link.indexOf('://') + 3;
        const pathStart = link.indexOf('/', authorityStart);
        if (pathStart < 0) return true;

        const queryStart = link.indexOf('?', pathStart);
        const fragmentStart = link.indexOf('#', pathStart);
        const pathEnd = [queryStart, fragmentStart]
            .filter(index => index >= 0)
            .reduce((earliest, index) => Math.min(earliest, index), link.length);
        const rawSegments = link.slice(pathStart + 1, pathEnd).split('/');

        if (rawSegments.length === 0 || rawSegments.some(segment => segment === '')) {
            return true;
        }

        try {
            return rawSegments.some(segment => {
                const decoded = decodeURIComponent(segment);
                return decoded === '.' || decoded === '..';
            });
        } catch {
            return true;
        }
    }

    private static base(
        serviceId: string,
        operation: 's' | 'p' | 'n' | 'c' | 'v',
        options: YeriaLinkOptions
    ): string {
        const id = serviceId.trim();
        if (!this.serviceIdPattern.test(id)) {
            throw new InvalidParameterError(
                'serviceId',
                serviceId,
                'Service ID must contain 1 to 128 URL-safe characters'
            );
        }

        const format = options.format ?? 'https';
        if (format === 'https') return `https://yeria.app/dl/${operation}/${id}`;
        if (format === 'yeria') return `yeria://dl/${operation}/${id}`;
        throw new InvalidParameterError('format', format, "Format must be 'https' or 'yeria'");
    }

    private static assertProviderPath(providerPath: string): string {
        const path = providerPath.trim();
        if (!this.isProviderPath(path)) {
            throw new InvalidParameterError(
                'providerPath',
                providerPath,
                'Provider path must be relative, non-empty, and contain no traversal or fragment'
            );
        }
        return path;
    }

    private static isProviderPath(path: string): boolean {
        if (!path || path.startsWith('//') || path.includes('\\') || path.includes('#')) {
            return false;
        }

        try {
            const rawPath = path.split('?')[0] ?? '';
            if (!rawPath) return false;
            if (rawPath.split('/').some(segment => {
                const decoded = decodeURIComponent(segment);
                return decoded === '.' || decoded === '..';
            })) {
                return false;
            }

            const parsed = new URL(path, 'https://service.invalid');
            if (parsed.origin !== 'https://service.invalid' || !parsed.pathname) return false;
            return true;
        } catch {
            return false;
        }
    }
}
