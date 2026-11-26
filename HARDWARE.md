# CoreXY Optical Scanning Gantry: Hardware Architecture & Specifications

> **Physical Hardware Subsystem for Rubrica Automated Exam Ingestion**  
> **Designed & Fabricated by**: Rehan Khan ([@certifiedtechidiot](https://github.com/certifiedtechidiot))  
> **Fabrication Fleet**: Anycubic Kobra Neo 2 (Direct-Drive High-Speed 3D Printer)  
> 🎥 **Live Machine Operation Demonstration**: [Watch on YouTube (youtu.be/zfYp0oZAK9k)](https://youtu.be/zfYp0oZAK9k)

[![CoreXY Scanner Machine Video Demo](https://img.youtube.com/vi/zfYp0oZAK9k/0.jpg)](https://youtu.be/zfYp0oZAK9k)

---

## 1. Overview & Mechanical Motivation
Manual document scanning using mobile handheld cameras introduces severe physical variations that compromise automated OCR accuracy:
- Non-uniform keystoning / perspective distortion.
- Glare hot-spots caused by ambient room lighting.
- Shadow casting from teacher/student hands or the camera body.
- Motion blur during high-throughput scanning.

To eliminate these optical failure modes, Rubrica pairs its software intelligence with a dedicated **CoreXY Optical Scanning Gantry**. The CoreXY architecture was specifically chosen over traditional Cartesian (Prusa-style) or cantilever mechanisms because **both stepper motors are mounted stationary on the outer frame**. This eliminates flying motor mass, drastically reducing moving gantry inertia and enabling rapid, vibration-free optical image capture across the entire scanning bed.

---

## 2. Mathematical Kinematics of CoreXY
The CoreXY mechanism translates rotational motion from two stationary stepper motors ($A$ and $B$) into orthogonal planar motion of the optical sensor carriage:

$$\Delta X = \frac{1}{2} (\Delta A + \Delta B)$$
$$\Delta Y = \frac{1}{2} (\Delta A - \Delta B)$$

Inverting these equations yields the required motor rotations for any desired displacement:
$$\Delta A = \Delta X + \Delta Y$$
$$\Delta B = \Delta X - \Delta Y$$

### Engineering Advantages:
- **Zero Motor Inertia on Gantry**: The optical carriage carries only the lightweight camera sensor and LED ring, eliminating mechanical ringing and overshoot.
- **Symmetric Belt Tension**: Opposing crossed GT2 timing belts distribute tension evenly across the linear guide rails, preventing carriage racking.
- **High Positional Repeatability**: $\pm 0.05\text{ mm}$ repeatability ensures identical focal distance ($Z = 320\text{ mm}$) and uniform document framing across every scanned page.

---

## 3. Structural & Fabrication Specifications

### Bill of Materials (BOM)
| Subsystem | Component | Specification | Quantity |
| :--- | :--- | :--- | :--- |
| **Motion** | Stepper Motors | NEMA-17 (1.8° step angle, 40mm body, 42N·cm holding torque) | 2 |
| **Transmission** | Timing Belts | GT2 6mm neoprene with fiberglass core | 2 × 1.8m |
| **Transmission** | Idler Pulleys | 20-tooth GT2 smooth and toothed idlers with dual 623ZZ bearings | 8 |
| **Linear Guide** | Guide Rods | 8mm hardened optical steel linear shafts (Hard chrome plated) | 4 |
| **Bearings** | Linear Motion | LM8UU linear ball bearings | 8 |
| **Structural Frame** | Extrusions | 2020 T-slot aluminum extrusions (V-slot compatible) | 450mm × 380mm |
| **Fabricated Parts** | Brackets & Mounts | High-infill (40%) PETG/PLA structural brackets | 3D Printed |
| **Illumination** | Lighting Array | 5500K High-CRI (>95) diffused LED ring light panel | 1 |
| **Bed Surface** | Document Base | Matte non-reflective high-contrast acrylic document bed | A4 / Legal |

### Additive Fabrication Details (Anycubic Kobra Neo 2)
All structural brackets—including motor corner mounts, idler tensioner blocks, and camera gimbal brackets—were modeled in CAD and fabricated on an **Anycubic Kobra Neo 2**:
- **Layer Height**: 0.20 mm
- **Infill**: 40% Gyroid (for isotropic torsional rigidity under belt tension)
- **Perimeters**: 4 walls (to withstand continuous static belt load of ~25 N)

---

## 4. Optical Acquisition & Lighting Array
- **Sensor Elevation ($Z$)**: Calibrated fixed height of $320\text{ mm}$ above the document bed, capturing the entire A4 examination sheet ($210 \times 297\text{ mm}$) within a standard 78° FOV lens without wide-angle fish-eye distortion.
- **Diffused Uniform Illumination**: A customized 5500K daylight-balanced LED array with an opal polycarbonate diffuser surrounds the optical sensor. This projects isotropic, shadow-free illumination across the page, preventing paper creases and ink indentations from creating dark false-positive OCR artifacts.
- **Auto-Capture Edge Triggering**: The optical feed continuously monitors the document bed. When a handwritten page is laid flat onto the registration corners, the contrast boundary triggers an instant image capture without requiring manual button presses.

---

## 5. Hardware-to-Cloud Integration Pipeline
1. Optical sensor captures raw 12MP frame on trigger.
2. Edge microcontroller / host bridge crops bounding box and checks illumination uniformity.
3. Transmitted via USB/Serial or Local Wi-Fi endpoint to the Rubrica client workspace.
4. Client-side canvas clamps and compresses frame to $1600\text{px}$ JPEG ($0.82$ quality) and initiates `evaluatePaperFn`.
