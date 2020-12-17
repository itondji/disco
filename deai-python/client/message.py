import argparse
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torchvision import datasets, transforms
from torch.optim.lr_scheduler import StepLR
import socket
import json
import time
import zmq

def send_model_state(tcp_socket, model):
    message = json.dumps(model.state_dict()).encode('utf-8')
    tcp_socket.sendall(message)


def receive_model_state(tcp_socket, model):