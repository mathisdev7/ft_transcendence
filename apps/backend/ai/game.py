
import pygame
import sys
import random
import numpy as np

# Initialize pygame
pygame.init()

# Constants
WIDTH, HEIGHT = 800, 600
PADDLE_WIDTH, PADDLE_HEIGHT = 15, 100
BALL_SIZE = 15
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
FPS = 60

class Paddle:
	def __init__(self, x, y, width, height, speed=5):
		self.rect = pygame.Rect(x, y, width, height)
		self.speed = speed
		self.score = 0
		
	def move(self, direction=0):  # -1 for up, 1 for down, 0 for no movement
		if direction < 0:
			self.rect.y = max(0, self.rect.y - self.speed)
		elif direction > 0:
			self.rect.y = min(HEIGHT - self.rect.height, self.rect.y + self.speed)
			
	def draw(self, surface):
		pygame.draw.rect(surface, WHITE, self.rect)
	
	def get_position(self):
		return self.rect.y + self.rect.height // 2

class Ball:
	def __init__(self, x, y, size, speed=5):
		self.rect = pygame.Rect(x, y, size, size)
		self.speed_x = speed * random.choice([-1, 1])
		self.speed_y = speed * random.choice([-1, 1])
		self.max_speed = 15
		
	def move(self):
		self.rect.x += self.speed_x
		self.rect.y += self.speed_y
		
	def bounce(self, paddle=None):
		# Bounce off top and bottom walls
		if self.rect.top <= 0 or self.rect.bottom >= HEIGHT:
			self.speed_y *= -1
			
		# Bounce off paddles
		if paddle and self.rect.colliderect(paddle.rect):
			relative_intersect_y = (paddle.rect.y + paddle.rect.height / 2) - (self.rect.y + self.rect.height / 2)
			normalized_relative_intersect_y = relative_intersect_y / (paddle.rect.height / 2)
			bounce_angle = normalized_relative_intersect_y * (5 * np.pi / 12)
			
			if self.rect.x < WIDTH // 2:
				self.speed_x = abs(self.speed_x) * 1.1
				self.speed_y = -self.speed_x * np.sin(bounce_angle)
			else:
				self.speed_x = -abs(self.speed_x) * 1.1
				self.speed_y = -self.speed_x * np.sin(bounce_angle)
			
			# Cap the speed
			if abs(self.speed_x) > self.max_speed:
				self.speed_x = self.max_speed * (1 if self.speed_x > 0 else -1)
			if abs(self.speed_y) > self.max_speed:
				self.speed_y = self.max_speed * (1 if self.speed_y > 0 else -1)
	
	def reset(self):
		self.rect.center = (WIDTH // 2, HEIGHT // 2)
		self.speed_x = 5 * random.choice([-1, 1])
		self.speed_y = 5 * random.choice([-1, 1])
		
	def draw(self, surface):
		pygame.draw.rect(surface, WHITE, self.rect)
	
	def get_position(self):
		return (self.rect.x, self.rect.y)

class PongGame:
	def __init__(self):
		self.left_paddle = Paddle(20, HEIGHT // 2 - PADDLE_HEIGHT // 2, PADDLE_WIDTH, PADDLE_HEIGHT)
		self.right_paddle = Paddle(WIDTH - 20 - PADDLE_WIDTH, HEIGHT // 2 - PADDLE_HEIGHT // 2, 
								  PADDLE_WIDTH, PADDLE_HEIGHT)
		self.ball = Ball(WIDTH // 2, HEIGHT // 2, BALL_SIZE)
		self.game_over = False
		
	def update(self, left_action=0, right_action=0):
		# Move paddles
		self.left_paddle.move(left_action)
		self.right_paddle.move(right_action)
		
		# Move ball
		self.ball.move()
		
		# Check for collisions
		self.ball.bounce(self.left_paddle)
		self.ball.bounce(self.right_paddle)
		
		# Check for scoring
		reward = 0
		if self.ball.rect.left <= 0:  # Right player scores
			self.right_paddle.score += 1
			self.ball.reset()
			reward = -1
		elif self.ball.rect.right >= WIDTH:  # Left player scores
			self.left_paddle.score += 1
			self.ball.reset()
			reward = 1
			
		return self.get_state(), reward, self.game_over
	
	def get_state(self):
		return [
			self.left_paddle.get_position() / HEIGHT,
			self.right_paddle.get_position() / HEIGHT,
			self.ball.get_position()[0] / WIDTH,
			self.ball.get_position()[1] / HEIGHT,
			self.ball.speed_x / self.ball.max_speed,
			self.ball.speed_y / self.ball.max_speed
		]
	
	def draw(self, surface):
		surface.fill(BLACK)
		pygame.draw.aaline(surface, WHITE, (WIDTH // 2, 0), (WIDTH // 2, HEIGHT))
		self.left_paddle.draw(surface)
		self.right_paddle.draw(surface)
		self.ball.draw(surface)
		
		font = pygame.font.Font(None, 74)
		left_score_text = font.render(str(self.left_paddle.score), True, WHITE)
		right_score_text = font.render(str(self.right_paddle.score), True, WHITE)
		surface.blit(left_score_text, (WIDTH // 4, 20))
		surface.blit(right_score_text, (3 * WIDTH // 4, 20))

class AIController:
	def __init__(self):
		# Placeholder for AI model
		pass
	
	def get_action(self, state):
		# For now, return random action
		return random.choice([-1, 0, 1])

def main():
	screen = pygame.display.set_mode((WIDTH, HEIGHT))
	pygame.display.set_caption("Pong AI Training")
	clock = pygame.time.Clock()
	
	game = PongGame()
	ai = AIController()
	
	running = True
	training_ai = True # Set to True to have AI control right paddle
	
	while running:
		for event in pygame.event.get():
			if event.type == pygame.QUIT:
				running = False
			if event.type == pygame.KEYDOWN:
				if event.key == pygame.K_t:
					training_ai = not training_ai
					print(f"AI Training: {'ON' if training_ai else 'OFF'}")
		
		# Get actions
		keys = pygame.key.get_pressed()
		left_action = 0
		if keys[pygame.K_w]:
			left_action = -1
		elif keys[pygame.K_s]:
			left_action = 1
		
		if training_ai:
			right_action = ai.get_action(game.get_state())
		else:
			right_action = 0
			if keys[pygame.K_UP]:
				right_action = -1
			elif keys[pygame.K_DOWN]:
				right_action = 1
		
		# Update game
		state, reward, done = game.update(left_action, right_action)
		
		# Render
		game.draw(screen)
		pygame.display.flip()
		
		# Cap the framerate
		clock.tick(FPS)
		
		if done:
			running = False
	
	pygame.quit()
	sys.exit()

if __name__ == "__main__":
	main()
