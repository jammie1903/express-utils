export class ServiceCache {

    private static map = {};

    static put(serviceName: string, service: any) {
        ServiceCache.map[serviceName] = service;
    }

    static get(serviceName: string) {
        return ServiceCache.map[serviceName];
    }
}
