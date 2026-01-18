def hex_to_rgb(hex_color):
    # Remove the "#" and convert the hex color to decimal RGB components
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def rgb_to_hex(rgb_color):
    # Convert the RGB components back to hex and return the color in hex format
    return '#{:02x}{:02x}{:02x}'.format(*rgb_color)

def midpoint_color_rounded(hex1, hex2):
    rgb1 = hex_to_rgb(hex1)
    rgb2 = hex_to_rgb(hex2)
    
    # Print RGB values for debugging
    print(f"RGB1: {rgb1}, RGB2: {rgb2}")
    
    # Find the rounded midpoint for each RGB component
    mid_rgb = tuple(round((v1 + v2) / 2) for v1, v2 in zip(rgb1, rgb2))
    
    # Print the calculated midpoint for debugging
    print(f"Midpoint RGB: {mid_rgb}")
    
    return rgb_to_hex(mid_rgb)

# Example usage
hex1 = "#222222"
# hex2 = "#333333"
hex2 = "#2a2a2a"
mid_color = midpoint_color_rounded(hex1, hex2)
print(mid_color)  # Should output: #2b2b2b

