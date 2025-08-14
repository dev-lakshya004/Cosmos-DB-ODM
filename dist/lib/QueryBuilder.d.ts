import { SqlParameter } from "@azure/cosmos";
declare class QB {
    private query;
    private params;
    private static globalParamCounter;
    constructor(query?: string, params?: SqlParameter[]);
    private nextParamName;
    private addParam;
    eq(field: string, value: number | string): QB;
    gt(field: string, value: number): QB;
    lt(field: string, value: number): QB;
    inArray(field: string, values: (number | string)[]): QB;
    ieq(field: string, value: string): QB;
    ilike(field: string, value: string): QB;
    ne(field: string, value: number | string): QB;
    and(...conditions: QB[]): QB;
    or(...conditions: QB[]): QB;
    build(): {
        query: string;
        params: SqlParameter[];
    };
}
declare const qb: () => QB;
export { QB, qb };
//# sourceMappingURL=QueryBuilder.d.ts.map