export interface MD_PARAM_DETAILS {
    name: string;
    required: string;
    def: string;
    rangetype: string;
    comment: string;
}
export interface MD_STRUCT {
    sum: string;
    param: MD_PARAM_DETAILS[];
    snippet: {
        nm: string;
        txt: string;
    }[];
    detail: string;
}
