class QB {
    constructor(query = "", params = []) {
        this.query = query;
        this.params = [...params];
    }
    nextParamName() {
        return `@param${++QB.globalParamCounter}`;
    }
    addParam(value) {
        return {
            name: this.nextParamName(),
            value: value,
        };
    }
    eq(field, value) {
        const param = this.addParam(value);
        return new QB(`c.${field} = ${param.name}`, [...this.params, param]);
    }
    gt(field, value) {
        const param = this.addParam(value);
        return new QB(`c.${field} > ${param.name}`, [...this.params, param]);
    }
    lt(field, value) {
        const param = this.addParam(value);
        return new QB(`c.${field} < ${param.name}`, [...this.params, param]);
    }
    inArray(field, values) {
        const params = values.map((v) => ({
            name: this.nextParamName(),
            value: v,
        }));
        const placeholders = params.map((p) => p.name).join(", ");
        return new QB(`c.${field} IN (${placeholders})`, [
            ...this.params,
            ...params,
        ]);
    }
    ieq(field, value) {
        const param = this.addParam(value.toLowerCase());
        return new QB(`LOWER(c.${field}) = ${param.name}`, [...this.params, param]);
    }
    ilike(field, value) {
        const param = this.addParam(value.toLowerCase());
        return new QB(`CONTAINS(LOWER(c.${field}), ${param.name})`, [
            ...this.params,
            param,
        ]);
    }
    ne(field, value) {
        const param = this.addParam(value);
        return new QB(`c.${field} != ${param.name}`, [...this.params, param]);
    }
    and(...conditions) {
        const combinedQuery = conditions.map((c) => `(${c.query})`).join(" AND ");
        const combinedParams = [
            ...this.params,
            ...conditions.flatMap((c) => c.params),
        ];
        return new QB(combinedQuery, combinedParams);
    }
    or(...conditions) {
        const combinedQuery = conditions.map((c) => `(${c.query})`).join(" OR ");
        const combinedParams = [
            ...this.params,
            ...conditions.flatMap((c) => c.params),
        ];
        return new QB(combinedQuery, combinedParams);
    }
    build() {
        return {
            query: this.query,
            params: this.params,
        };
    }
}
QB.globalParamCounter = 0; // Static counter to ensure unique param names
const qb = () => new QB();
export { QB, qb };
//# sourceMappingURL=QueryBuilder.js.map