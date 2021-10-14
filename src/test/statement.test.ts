import { compile } from "..";
import dedent from "dedent";

//
// Normalize whitespace so we don't have to consider it when testing.
//
function normalize(input: string): string {
    return input.split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join("\n");
}

describe("statement", () => {

    //
    // Compile the input string and check it against the expected output.
    // 
    function check(input: string, expected: string): void {
        const teal = normalize(compile(input));
        const expectedTeal = normalize(expected);
        if (teal !== expectedTeal) {
            console.log(`Compiled:\r\n"${teal}"\r\nExpected:\r\n"${expectedTeal}"`);
        }
        expect(teal).toEqual(expectedTeal);
    }

    it("can compile an expression statement", ()  => {

        check(
            "1 + 1 ;",
            dedent(`
                #pragma version 4
                int 1
                int 1
                +
            `)
        );
    });

    it("can compile a return statement", ()  => {

        check(
            "return 1 ;",
            dedent(`
                #pragma version 4   
                int 1
                return
            `)
        );
    });

    it("can compile multiple statements", ()  => {

        check(
            "1 + 2 ; return 3 ;",
            dedent(`
                #pragma version 4
                int 1
                int 2
                +
                int 3
                return
            `)
        );
    });

    it("can declare and use a variable", ()  => {

        check(
            dedent(`
                let x = 2;
                return x > 3;
            `),
            dedent(`
                #pragma version 4
                int 2
                store 1
                load 1
                int 3
                >
                return
            `)
        );
    });

    it("can compile if statement", () => {

        check(
            dedent(`
                if (2 > 1) {
                    return 5;
                }
                else {
                    return 10;
                }
            `),
            dedent(`
                #pragma version 4
                int 2
                int 1
                >
                bz else-1
                int 5
                return
                b end-1
                else-1:
                int 10
                return
                end-1:            
            `)
        );
    });

    it("can compile if statement with no else block", () => {

        check(
            dedent(`
                if (2 > 1) {
                    return 5;
                }
            `),
            dedent(`
                #pragma version 4
                int 2
                int 1
                >
                bz else-1
                int 5
                return
                b end-1
                else-1:
                end-1:            
            `)
        );
    });

    it("can compile an assignment", () => {
        check(
            dedent(`
                let a;
                a = 3;
            `),
            dedent(`
                #pragma version 4
                int 3
                store 1
            `)
        );
    });

    it("empty statements are allowed", () => {
        check(
            dedent(`
                ;
                  ;  
            `),
            dedent(`
                #pragma version 4
            `)
        );
    });

    it("can't assign to a number", () => {
        expect(() => compile("1=1;")).toThrow();
    });

    it("can't access undefined variable", () => {
        expect(() => compile("a = 1;")).toThrow();
    });

    it("can't redefine variable", () => {
        expect(() => {
            compile(`
                var a;
                var a;
            `)
        }).toThrow();
    });

    it("can declare and use a constant", ()  => {

        check(
            dedent(`
                const x = 2;
                return x > 3;
            `),
            dedent(`
                #pragma version 4
                int 2
                store 1
                load 1
                int 3
                >
                return
            `)
        );
    });

    it("must initialize a constant", () => {
        expect(() => compile("const a;")).toThrow();
    });

    it("can't redefine a constant", () => {
        expect(() => {
            compile(`
                const a = 1;
                a = 2;
            `)
        }).toThrow();
    });

    it("can declare a function with zero args", () => {
        check(
            dedent(`
                function myFunction() {
                    return 1;
                }
            `),
            dedent(`
                #pragma version 4
                int 256
                store 0
                b program-end
                fn-myFunction:
                load 0
                load 0
                int 1
                -
                store 0
                load 0
                swap
                stores
                int 1
                retsub
                load 0
                loads
                save 0
                retsub
                program-end:
            `)
        );
    });

    it("can declare a function with one arg", () => {
        check(
            dedent(`
                function myFunction(a) {
                    return 1;
                }
            `),
            dedent(`
                #pragma version 4
                int 256
                store 0
                b program-end
                fn-myFunction:
                load 0
                load 0
                int 2
                -
                store 0
                load 0
                swap
                stores
                int 1
                load 0
                +
                stores
                int 1
                retsub
                load 0
                loads
                save 0
                retsub
                program-end:
            `)
        );
    });

    it("can declare a function with multiple args", () => {
        check(
            dedent(`
                function myFunction(a, b, c) {
                    return 1;
                }
            `),
            dedent(`
                #pragma version 4
                int 256
                store 0
                b program-end
                fn-myFunction:
                load 0
                load 0
                int 4
                -
                store 0
                load 0
                swap
                stores
                int 1
                load 0
                +
                stores
                int 2
                load 0
                +
                stores
                int 3
                load 0
                +
                stores
                int 1
                retsub
                load 0
                loads
                save 0
                retsub
                program-end:
            `)
        );
    });

    it("code for functions is moved to the end", () => {
        check(
            dedent(`
                const a = 1;
                function myFunction(a, b, c) {
                    return 1;
                }
                const b = 2;
            `),
            dedent(`
                #pragma version 4
                int 256
                store 0
                int 1
                store 1
                int 2
                store 2
                b program-end
                fn-myFunction:
                load 0
                load 0
                int 4
                -
                store 0
                load 0
                swap
                stores
                int 1
                load 0
                +
                stores
                int 2
                load 0
                +
                stores
                int 3
                load 0
                +
                stores
                int 1
                retsub
                load 0
                loads
                save 0
                retsub
                program-end:
            `)
        );
    });

    it("can declare multiple functions", () => {
        check(
            dedent(`
                function fn1() {
                    return 1;
                }
                function fn2() {
                    return 2;
                }
            `),
            dedent(`
                #pragma version 4
                int 256
                store 0
                b program-end
                fn-fn1:
                load 0
                load 0
                int 1
                -
                store 0
                load 0
                swap
                stores
                int 1
                retsub
                load 0
                loads
                save 0
                retsub
                fn-fn2:
                load 0
                load 0
                int 1
                -
                store 0
                load 0
                swap
                stores
                int 2
                retsub
                load 0
                loads
                save 0
                retsub
                program-end:
            `)
        );
    });
});
