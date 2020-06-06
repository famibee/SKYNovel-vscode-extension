import { DebugProtocol } from 'vscode-debugprotocol';
export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
    program: string;
    stopOnEntry?: boolean;
    trace?: boolean;
}
