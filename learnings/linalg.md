# Linear Algebra Basics

## Scalars, Vectors, Matrices, and Tensors

### Scalars
A scalar is just a single number.

**Example:**
- `s = 5` (a scalar)
- `temperature = 25.5` (a scalar)

### Vectors
A vector is an array of numbers arranged in order.

**Example:**
```
x = [1, 2, 3]
```
This vector has 3 elements: x₁ = 1, x₂ = 2, x₃ = 3.

Vectors can represent points in space. For example, `[2, 5]` represents a point 2 units right and 5 units up.

### Matrices
A matrix is a 2-D array of numbers, organized in rows and columns.

**Example:**
```
A = [1  2]
    [3  4]
    [5  6]
```
This is a 3×2 matrix (3 rows, 2 columns). The element in row 2, column 1 is A₂,₁ = 3.

**Matrix Transpose:**
The transpose flips a matrix across its diagonal (rows become columns).

**Example:**
```
A = [1  2]        Aᵀ = [1  3  5]
    [3  4]             [2  4  6]
    [5  6]
```

### Tensors
A tensor is an array with more than two dimensions (generalization of matrices).

**Example:**
- A 3D tensor could represent a stack of matrices or RGB image data

## Matrix Operations

### Addition
Add matrices element by element (they must be the same size).

**Example:**
```
A = [1  2]    B = [5  6]    A + B = [6  8]
    [3  4]        [7  8]            [10 12]
```

### Scalar Multiplication
Multiply every element by a number.

**Example:**
```
A = [1  2]    2A = [2  4]
    [3  4]         [6  8]
```

### Broadcasting
Adding a vector to a matrix adds the vector to each row.

**Example:**
```
A = [1  2]    b = [1  1]    A + b = [2  3]
    [3  4]                         [4  5]
```

## Matrix Multiplication

Matrix multiplication is one of the most important operations.

**Rules:**
- If A is m×n and B is n×p, then AB is m×p
- The number of columns in A must equal the number of rows in B

**Example:**
```
A = [1  2]    B = [5  6]    AB = [1×5+2×7  1×6+2×8] = [19  22]
    [3  4]        [7  8]         [3×5+4×7  3×6+4×8]   [43  50]
```

**Key Properties:**
- **Not commutative:** AB ≠ BA (in general)
- **Associative:** A(BC) = (AB)C
- **Distributive:** A(B + C) = AB + AC
- **Transpose rule:** (AB)ᵀ = BᵀAᵀ

### Dot Product
The dot product of two vectors is: xᵀy = x₁y₁ + x₂y₂ + ... + xₙyₙ

**Example:**
```
x = [1, 2, 3]    y = [4, 5, 6]
xᵀy = 1×4 + 2×5 + 3×6 = 4 + 10 + 18 = 32
```

## Solving Linear Equations

We can write systems of equations as: **Ax = b**

**Example:**
```
2x₁ + 3x₂ = 7
4x₁ + x₂  = 9

Can be written as:
[2  3] [x₁] = [7]
[4  1] [x₂]   [9]
```

## Identity and Inverse Matrices

### Identity Matrix
An identity matrix I has 1s on the diagonal and 0s elsewhere. Multiplying by I doesn't change anything.

**Example:**
```
I₃ = [1  0  0]
     [0  1  0]
     [0  0  1]

For any vector x: Ix = x
```

### Matrix Inverse
The inverse of A (denoted A⁻¹) satisfies: A⁻¹A = I

**Example:**
If A = [2  1] then A⁻¹ = [1  -1]
     [1  1]              [-1  2]

Check: A⁻¹A = I

**Solving equations with inverse:**
If Ax = b, then x = A⁻¹b

**Note:** Not all matrices have inverses. A matrix must be square and have linearly independent columns.

## Linear Dependence and Span

### Linear Combination
A linear combination of vectors multiplies each by a scalar and adds them.

**Example:**
```
v₁ = [1, 0]    v₂ = [0, 1]
2v₁ + 3v₂ = [2, 0] + [0, 3] = [2, 3]
```

### Span
The span of vectors is all points you can reach using linear combinations.

**Example:**
- Two independent vectors in 2D can span the entire 2D plane
- Two parallel vectors can only span a line

### Linear Independence
Vectors are linearly independent if none can be written as a combination of the others.

**Example:**
- `[1, 0]` and `[0, 1]` are independent
- `[1, 2]` and `[2, 4]` are dependent (second is 2× the first)

## Norms (Measuring Vector Size)

Norms measure the "size" or "length" of vectors.

### L₂ Norm (Euclidean Norm)
The standard distance from origin: ||x||₂ = √(x₁² + x₂² + ... + xₙ²)

**Example:**
```
x = [3, 4]
||x||₂ = √(3² + 4²) = √(9 + 16) = √25 = 5
```

Often written as ||x|| (subscript 2 omitted).

**Squared L₂ Norm:** xᵀx = x₁² + x₂² + ... + xₙ² (easier to compute, no square root)

### L₁ Norm
Sum of absolute values: ||x||₁ = |x₁| + |x₂| + ... + |xₙ|

**Example:**
```
x = [3, -4]
||x||₁ = |3| + |-4| = 3 + 4 = 7
```

Useful when you care about distinguishing zero from small values.

### L∞ Norm (Max Norm)
Largest absolute value: ||x||∞ = max(|x₁|, |x₂|, ..., |xₙ|)

**Example:**
```
x = [3, -7, 2]
||x||∞ = max(3, 7, 2) = 7
```

### Frobenius Norm (for Matrices)
||A||F = √(sum of all squared elements)

**Example:**
```
A = [1  2]
    [3  4]
||A||F = √(1² + 2² + 3² + 4²) = √30
```

## Special Matrices and Vectors

### Diagonal Matrix
Only has non-zero entries on the main diagonal.

**Example:**
```
D = [3  0  0]
    [0  5  0]
    [0  0  2]
```

**Properties:**
- Easy to multiply: diag(v)x = v ⊙ x (element-wise)
- Easy to invert: diag([a, b, c])⁻¹ = diag([1/a, 1/b, 1/c])

### Symmetric Matrix
A matrix equal to its transpose: A = Aᵀ

**Example:**
```
A = [1  2  3]    Aᵀ = [1  2  3]
    [2  4  5]         [2  4  5]
    [3  5  6]         [3  5  6]
```
A is symmetric because A = Aᵀ

### Unit Vector
A vector with norm 1: ||x||₂ = 1

**Example:**
```
x = [0.6, 0.8]
||x||₂ = √(0.6² + 0.8²) = √(0.36 + 0.64) = √1 = 1
```

### Orthogonal Vectors
Two vectors are orthogonal if their dot product is 0: xᵀy = 0

**Example:**
```
x = [1, 0]    y = [0, 1]
xᵀy = 1×0 + 0×1 = 0
```
They're at a 90° angle to each other.

### Orthonormal Vectors
Vectors that are both orthogonal and have unit norm.

**Example:**
```
x = [1, 0]    y = [0, 1]
Both are unit vectors and orthogonal
```

### Orthogonal Matrix
A square matrix where rows and columns are orthonormal: AᵀA = AAᵀ = I

**Key property:** A⁻¹ = Aᵀ (inverse equals transpose - very cheap to compute!)

**Example:**
```
A = [0.6  -0.8]    Aᵀ = [0.6   0.8]
    [0.8   0.6]         [-0.8  0.6]

AᵀA = I (check this!)
```
