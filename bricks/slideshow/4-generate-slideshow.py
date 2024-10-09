#!/usr/bin/env python 
import os

# Get all .png files in the current directory and sort them
png_files = sorted([f for f in os.listdir('.') if f.endswith('.png')])

# Start building the HTML content
html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Full Screen Image Slideshow</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: black;
        }
        .slideshow-container {
            position: relative;
            width: 100%;
            height: 100%;
        }
        .slides {
            display: none;
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .active {
            display: block;
        }
        .prev, .next {
            cursor: pointer;
            position: absolute;
            top: 50%;
            padding: 16px;
            color: white;
            font-weight: bold;
            font-size: 18px;
            transition: 0.6s ease;
            border-radius: 3px;
            user-select: none;
        }
        .prev {
            left: 0;
            background-color: rgba(0, 0, 0, 0.5);
        }
        .next {
            right: 0;
            background-color: rgba(0, 0, 0, 0.5);
        }
        .prev:hover, .next:hover {
            background-color: rgba(0, 0, 0, 0.8);
        }
    </style>
</head>
<body>

<div class="slideshow-container">
'''

# Add each PNG file to the slideshow
for index, file in enumerate(png_files):
    if index == 0:
        html_content += f'    <img class="slides active" src="{file}" alt="{file}">\n'
    else:
        html_content += f'    <img class="slides" src="{file}" alt="{file}">\n'

# Add the navigation buttons and script for slideshow functionality
html_content += '''
    <!-- Previous and next buttons -->
    <a class="prev" onclick="changeSlide(-1)">&#10094;</a>
    <a class="next" onclick="changeSlide(1)">&#10095;</a>
</div>

<script>
    let currentSlide = 0;
    const slides = document.getElementsByClassName('slides');

    function showSlide(index) {
        for (let i = 0; i < slides.length; i++) {
            slides[i].classList.remove('active');
        }
        currentSlide = (index + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
    }

    function changeSlide(direction) {
        showSlide(currentSlide + direction);
    }

    document.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowRight') {
            changeSlide(1);
        } else if (event.key === 'ArrowLeft') {
            changeSlide(-1);
        }
    });
</script>

</body>
</html>
'''

# Write the HTML content to slideshow.html
with open('slideshow.html', 'w') as file:
    file.write(html_content)

print("Slideshow HTML has been generated as 'slideshow.html'.")

