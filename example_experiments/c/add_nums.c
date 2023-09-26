/* Example: Add 2 nums. Requires ini.h and ini.c to read variables*/

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// INI file parser here: https://github.com/benhoyt/inih
#include "./include/ini.h"

typedef struct
{
    int x;
    int y;
} configuration;

static int handler(void* user, const char* section, const char* name,
                   const char* value)
{
    configuration* pconfig = (configuration*)user;

    #define MATCH(s, n) strcmp(section, s) == 0 && strcmp(name, n) == 0
    if (MATCH("DEFAULT", "x")) {
        pconfig->x = atoi(value);
    } else if (MATCH("DEFAULT", "y")) {
        pconfig->y = atoi(value);
    } else {
        return 0;  /* unknown section/name, error */
    }
    return 1;
}

int main(int argc, char *argv[]) {
    configuration config;
    // defaults
    config.x = 0;
    config.y = 0;

    if (ini_parse(argv[1], handler, &config) < 0) {
        printf("Can't load '%s'\n", argv[1]);
        return 1;
    }
    printf("Config loaded from '%s': x=%d, y=%d\n",
        argv[1], config.x, config.y);

    FILE *fpt = fopen("AddNumResult.csv", "w+");
    fprintf(fpt, "Addition,Subtraction\n%d,%d", config.x+config.y, config.x-config.y);
    fclose(fpt);
    printf("done\n");
}