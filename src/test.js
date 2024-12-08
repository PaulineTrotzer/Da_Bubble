let numbers = "1.5, 2, 3.8, 10, 40"

let numbers_as_Array = numbers.split(',');
let sum = 0;

for(let i = 0; i < numbers_as_Array.length; i++){
    const n = numbers_as_Array[i];
    sum += n;
}
console.log(sum);