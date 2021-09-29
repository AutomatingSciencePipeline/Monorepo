#include <stdio.h>

// simple file for testing experimental pipeline

int main(int argc, char *argv[]){
    FILE *f = fopen("results.csv", "w");
    
    if (argc != 3){
        printf("3 arguments expected, %d given\n", argc);
        return 1;
    }
    if (f == NULL){
        printf("Error opening file\n");
        return 1;
    }

    int num1;
    int num2;
    sscanf (argv[1], "%d", &num1);
    sscanf (argv[2], "%d", &num2);

    fprintf(f, "result, %d\n", num1 + num2);
    fclose(f);

    return 0;
}