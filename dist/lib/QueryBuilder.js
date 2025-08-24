class QB {
    constructor(query = { name: "" }, params = []) {
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
    asc(field) {
        let query = `c.${field.name} ASC`;
        return query;
    }
    desc(field) {
        let query = `c.${field.name} DESC`;
        return query;
    }
    order(...fields) {
        return "ORDER BY " + fields.join(", ");
    }
    eq(field, value) {
        const param = this.addParam(value);
        return new QB({ name: `c.${field.name} = ${param.name}` }, [
            ...this.params,
            param,
        ]);
    }
    gt(field, value) {
        const param = this.addParam(value);
        return new QB({ name: `c.${field.name} > ${param.name}` }, [
            ...this.params,
            param,
        ]);
    }
    gte(field, value) {
        const param = this.addParam(value);
        return new QB({ name: `c.${field.name} >= ${param.name}` }, [
            ...this.params,
            param,
        ]);
    }
    lt(field, value) {
        const param = this.addParam(value);
        return new QB({ name: `c.${field.name} < ${param.name}` }, [
            ...this.params,
            param,
        ]);
    }
    lte(field, value) {
        const param = this.addParam(value);
        return new QB({ name: `c.${field.name} <= ${param.name}` }, [
            ...this.params,
            param,
        ]);
    }
    inArray(field, values) {
        const params = values.map((v) => ({
            name: this.nextParamName(),
            value: v,
        }));
        const placeholders = params.map((p) => p.name).join(", ");
        return new QB({ name: `c.${field.name} IN (${placeholders})` }, [
            ...this.params,
            ...params,
        ]);
    }
    ieq(field, value) {
        const param = this.addParam(value.toLowerCase());
        return new QB({ name: `LOWER(c.${field.name}) = ${param.name}` }, [
            ...this.params,
            param,
        ]);
    }
    ilike(field, value) {
        const param = this.addParam(value.toLowerCase());
        return new QB({ name: `CONTAINS(LOWER(c.${field.name}), ${param.name})` }, [
            ...this.params,
            param,
        ]);
    }
    ne(field, value) {
        const param = this.addParam(value);
        return new QB({ name: `c.${field.name} != ${param.name}` }, [
            ...this.params,
            param,
        ]);
    }
    and(...conditions) {
        const combinedQuery = conditions
            .map((c) => `(${c.query.name})`)
            .join(" AND ");
        const combinedParams = [
            ...this.params,
            ...conditions.flatMap((c) => c.params),
        ];
        return new QB({ name: combinedQuery }, combinedParams);
    }
    or(...conditions) {
        const combinedQuery = conditions
            .map((c) => `(${c.query.name})`)
            .join(" OR ");
        const combinedParams = [
            ...this.params,
            ...conditions.flatMap((c) => c.params),
        ];
        return new QB({ name: combinedQuery }, combinedParams);
    }
    build() {
        return {
            query: this.query.name,
            params: this.params,
        };
    }
}
QB.globalParamCounter = 0;
const qb = () => new QB();
export { QB, qb };
//# sourceMappingURL=QueryBuilder.js.map