import { SqlParameter } from "@azure/cosmos";
declare class QB {
    private query;
    private params;
    private static globalParamCounter;
    constructor(query?: {
        name: string;
    }, params?: SqlParameter[]);
    private nextParamName;
    private addParam;
    asc(field: {
        name: string;
    }): string;
    desc(field: {
        name: string;
    }): string;
    order(...fields: Array<string>): string;
    eq(field: {
        name: string;
    }, value: number | string): QB;
    gt(field: {
        name: string;
    }, value: number): QB;
    gte(field: {
        name: string;
    }, value: number): QB;
    lt(field: {
        name: string;
    }, value: number): QB;
    lte(field: {
        name: string;
    }, value: number): QB;
    inArray(field: {
        name: string;
    }, values: (number | string)[]): QB;
    ieq(field: {
        name: string;
    }, value: string): QB;
    ilike(field: {
        name: string;
    }, value: string): QB;
    ne(field: {
        name: string;
    }, value: number | string): QB;
    and(...conditions: QB[]): QB;
    or(...conditions: QB[]): QB;
    arrayContains(field: {
        name: string;
    }, value: number | string): QB;
    build(): {
        query: string;
        params: SqlParameter[];
    };
}
declare const qb: () => QB;
export { QB, qb };
//# sourceMappingURL=QueryBuilder.d.ts.map