export interface MD_PARAM_DETAILS {
    name: string;
    required: string;
    default: string;
    rangetype: string;
    comment: string;
}
export interface MD_STRUCT {
    detail: string;
    param: MD_PARAM_DETAILS[];
    snippet: {
        nm: string;
        txt: string;
    }[];
    comment: string;
}
