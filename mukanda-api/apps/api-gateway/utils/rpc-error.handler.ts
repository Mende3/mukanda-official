import { HttpException, HttpStatus } from "@nestjs/common";
import { catchError, throwError } from "rxjs";

export const handlerRcpError = catchError (err => {
    
    const status = err?.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const message = err?.message ?? 'Erro interno';
    return throwError(
        () => new HttpException (message,status,),
    );
});