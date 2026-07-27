import { RpcException } from '@nestjs/microservices';
import { error } from 'console';
import { AxiosError } from 'axios';
import { EvoGoInstance, EvoGoResponse, evoGoError } from './interfaces';


export const handleError =  (error: AxiosError<evoGoError>) => {
    const message = (error.response?.data)?.error ?? error.message;
    throw new RpcException ({
        statusCodee: error.response?.status ?? 500,
        message: message
    }); 
}